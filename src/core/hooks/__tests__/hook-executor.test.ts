import type { z } from 'zod';
import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { HookPhase } from '@/core/hooks/types';
import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import {
  executePhaseHooks,
  processHookResult,
  resolveCommandHooks,
} from '@/core/hooks/hook-executor';

const makeHook = (result: HookResult): jest.Mocked<Hook> => ({
  execute: jest.fn().mockResolvedValue(result),
});

const makeArgs = (hooks?: Map<HookPhase, Hook[]>): CommandHandlerArgs =>
  ({
    args: {},
    hooks,
  }) as unknown as CommandHandlerArgs;

describe('resolveCommandHooks', () => {
  it('returns the hooks map from args when present', () => {
    const map = new Map<HookPhase, Hook[]>();
    const result = resolveCommandHooks(makeArgs(map));
    expect(result).toBe(map);
  });

  it('returns an empty map when args.hooks is undefined', () => {
    const result = resolveCommandHooks(makeArgs(undefined));
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });
});

describe('executePhaseHooks', () => {
  it('returns { breakFlow: false } when hooks map is undefined', async () => {
    const result = await executePhaseHooks(
      undefined,
      'preBuildTransaction',
      {},
    );
    expect(result).toEqual({ breakFlow: false });
  });

  it('returns { breakFlow: false } when no hooks are registered for the phase', async () => {
    const map = new Map<HookPhase, Hook[]>();
    const result = await executePhaseHooks(map, 'preBuildTransaction', {});
    expect(result).toEqual({ breakFlow: false });
  });

  it('returns { breakFlow: false } when all hooks pass', async () => {
    const hookA = makeHook({ breakFlow: false });
    const hookB = makeHook({ breakFlow: false });
    const map = new Map<HookPhase, Hook[]>([
      ['preBuildTransaction', [hookA, hookB]],
    ]);

    const result = await executePhaseHooks(map, 'preBuildTransaction', {
      data: 1,
    });

    expect(result).toEqual({ breakFlow: false });
    expect(hookA.execute).toHaveBeenCalledWith({ data: 1 });
    expect(hookB.execute).toHaveBeenCalledWith({ data: 1 });
  });

  it('stops execution and returns breakFlow result when a hook breaks flow', async () => {
    const breakResult: HookResult = {
      breakFlow: true,
      result: { stopped: true },
    };
    const hookA = makeHook(breakResult);
    const hookB = makeHook({ breakFlow: false });
    const map = new Map<HookPhase, Hook[]>([
      ['preSignTransaction', [hookA, hookB]],
    ]);

    const result = await executePhaseHooks(map, 'preSignTransaction', {});

    expect(result).toBe(breakResult);
    expect(hookA.execute).toHaveBeenCalledTimes(1);
    expect(hookB.execute).not.toHaveBeenCalled();
  });

  it('stops at the first breaking hook when multiple hooks precede it', async () => {
    const hookA = makeHook({ breakFlow: false });
    const breakResult: HookResult = {
      breakFlow: true,
      result: { msg: 'halt' },
    };
    const hookB = makeHook(breakResult);
    const hookC = makeHook({ breakFlow: false });
    const map = new Map<HookPhase, Hook[]>([
      ['preExecuteTransaction', [hookA, hookB, hookC]],
    ]);

    const result = await executePhaseHooks(map, 'preExecuteTransaction', {});

    expect(result).toBe(breakResult);
    expect(hookA.execute).toHaveBeenCalledTimes(1);
    expect(hookB.execute).toHaveBeenCalledTimes(1);
    expect(hookC.execute).not.toHaveBeenCalled();
  });

  it('runs hooks only for the requested phase, ignoring others', async () => {
    const hookForOtherPhase = makeHook({ breakFlow: false });
    const hookForPhase = makeHook({ breakFlow: false });
    const map = new Map<HookPhase, Hook[]>([
      ['preParamsNormalization', [hookForOtherPhase]],
      ['preBuildTransaction', [hookForPhase]],
    ]);

    await executePhaseHooks(map, 'preBuildTransaction', {});

    expect(hookForPhase.execute).toHaveBeenCalledTimes(1);
    expect(hookForOtherPhase.execute).not.toHaveBeenCalled();
  });

  it('passes params to hook.execute', async () => {
    const hook = makeHook({ breakFlow: false });
    const params = { commandName: 'test-cmd', args: { foo: 'bar' } };
    const map = new Map<HookPhase, Hook[]>([['preOutputPreparation', [hook]]]);

    await executePhaseHooks(map, 'preOutputPreparation', params);

    expect(hook.execute).toHaveBeenCalledWith(params);
  });
});

describe('processHookResult', () => {
  it('maps result, schema, and humanTemplate to CommandResult', () => {
    const schema = {} as z.ZodTypeAny;
    const hookResult = {
      breakFlow: true as const,
      result: { data: 42 },
      schema,
      humanTemplate: 'Hello {{name}}',
    };

    const commandResult = processHookResult(hookResult);

    expect(commandResult).toEqual({
      result: { data: 42 },
      overrideSchema: schema,
      overrideHumanTemplate: 'Hello {{name}}',
    });
  });

  it('produces undefined overrideSchema and overrideHumanTemplate when not provided', () => {
    const hookResult = {
      breakFlow: true as const,
      result: { ok: true },
    };

    const commandResult = processHookResult(hookResult);

    expect(commandResult.result).toEqual({ ok: true });
    expect(commandResult.overrideSchema).toBeUndefined();
    expect(commandResult.overrideHumanTemplate).toBeUndefined();
  });
});

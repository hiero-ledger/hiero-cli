import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { CommandResult, HookPhase } from '@/core/plugins/plugin.types';

import { BaseTransactionCommand } from '@/core/commands/command';

// ---------------------------------------------------------------------------
// Minimal concrete implementation for testing
// ---------------------------------------------------------------------------

type Params = { value: number };
type Built = { tx: string };
type Signed = { sig: string };
type Executed = { receipt: string };

class TestCommand extends BaseTransactionCommand<
  Params,
  Built,
  Signed,
  Executed
> {
  normalizeParams = jest.fn<Promise<Params>, [CommandHandlerArgs]>();
  buildTransaction = jest.fn<Promise<Built>, [CommandHandlerArgs, Params]>();
  signTransaction = jest.fn<
    Promise<Signed>,
    [CommandHandlerArgs, Params, Built]
  >();
  executeTransaction = jest.fn<
    Promise<Executed>,
    [CommandHandlerArgs, Params, Built, Signed]
  >();
  outputPreparation = jest.fn<
    Promise<CommandResult>,
    [CommandHandlerArgs, Params, Built, Signed, Executed]
  >();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeArgs = (hooks?: Map<HookPhase, Hook[]>): CommandHandlerArgs =>
  ({
    args: {},
    hooks,
  }) as unknown as CommandHandlerArgs;

const makeHook = (result: HookResult): jest.Mocked<Hook> => ({
  execute: jest.fn().mockResolvedValue(result),
});

const defaultResults = {
  params: { value: 1 },
  built: { tx: 'tx-data' },
  signed: { sig: 'sig-data' },
  executed: { receipt: 'receipt-data' },
  output: { result: { done: true } } as CommandResult,
};

const wireDefaults = (cmd: TestCommand) => {
  cmd.normalizeParams.mockResolvedValue(defaultResults.params);
  cmd.buildTransaction.mockResolvedValue(defaultResults.built);
  cmd.signTransaction.mockResolvedValue(defaultResults.signed);
  cmd.executeTransaction.mockResolvedValue(defaultResults.executed);
  cmd.outputPreparation.mockResolvedValue(defaultResults.output);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BaseTransactionCommand', () => {
  let cmd: TestCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    cmd = new TestCommand('test-command');
    wireDefaults(cmd);
  });

  describe('happy path — no hooks', () => {
    it('calls all pipeline stages in order and returns outputPreparation result', async () => {
      const args = makeArgs();
      const order: string[] = [];

      cmd.normalizeParams.mockImplementation(async () => {
        order.push('normalize');
        return defaultResults.params;
      });
      cmd.buildTransaction.mockImplementation(async () => {
        order.push('build');
        return defaultResults.built;
      });
      cmd.signTransaction.mockImplementation(async () => {
        order.push('sign');
        return defaultResults.signed;
      });
      cmd.executeTransaction.mockImplementation(async () => {
        order.push('execute');
        return defaultResults.executed;
      });
      cmd.outputPreparation.mockImplementation(async () => {
        order.push('output');
        return defaultResults.output;
      });

      const result = await cmd.execute(args);

      expect(order).toEqual([
        'normalize',
        'build',
        'sign',
        'execute',
        'output',
      ]);
      expect(result).toBe(defaultResults.output);
    });

    it('passes results from each stage to the next', async () => {
      const args = makeArgs();
      await cmd.execute(args);

      expect(cmd.buildTransaction).toHaveBeenCalledWith(
        args,
        defaultResults.params,
      );
      expect(cmd.signTransaction).toHaveBeenCalledWith(
        args,
        defaultResults.params,
        defaultResults.built,
      );
      expect(cmd.executeTransaction).toHaveBeenCalledWith(
        args,
        defaultResults.params,
        defaultResults.built,
        defaultResults.signed,
      );
      expect(cmd.outputPreparation).toHaveBeenCalledWith(
        args,
        defaultResults.params,
        defaultResults.built,
        defaultResults.signed,
        defaultResults.executed,
      );
    });
  });

  describe('hook break-flow behaviour', () => {
    const phases: HookPhase[] = [
      'preParamsNormalization',
      'preBuildTransaction',
      'preSignTransaction',
      'preExecuteTransaction',
      'preOutputPreparation',
      'postOutputPreparation',
    ];

    it.each(phases)(
      'short-circuits at %s and returns hook result',
      async (phase) => {
        const hookResult: HookResult = {
          breakFlow: true,
          result: { stoppedAt: phase },
        };
        const hook = makeHook(hookResult);
        const hooks = new Map<HookPhase, Hook[]>([[phase, [hook]]]);
        const args = makeArgs(hooks);

        const result = await cmd.execute(args);

        expect(result).toEqual({
          result: { stoppedAt: phase },
          overrideSchema: undefined,
          overrideHumanTemplate: undefined,
        });
      },
    );

    it('does not call normalizeParams when preParamsNormalization breaks', async () => {
      const hooks = new Map<HookPhase, Hook[]>([
        ['preParamsNormalization', [makeHook({ breakFlow: true, result: {} })]],
      ]);
      await cmd.execute(makeArgs(hooks));
      expect(cmd.normalizeParams).not.toHaveBeenCalled();
    });

    it('does not call buildTransaction when preBuildTransaction breaks', async () => {
      const hooks = new Map<HookPhase, Hook[]>([
        ['preBuildTransaction', [makeHook({ breakFlow: true, result: {} })]],
      ]);
      await cmd.execute(makeArgs(hooks));
      expect(cmd.buildTransaction).not.toHaveBeenCalled();
    });

    it('does not call signTransaction when preSignTransaction breaks', async () => {
      const hooks = new Map<HookPhase, Hook[]>([
        ['preSignTransaction', [makeHook({ breakFlow: true, result: {} })]],
      ]);
      await cmd.execute(makeArgs(hooks));
      expect(cmd.signTransaction).not.toHaveBeenCalled();
    });

    it('does not call executeTransaction when preExecuteTransaction breaks', async () => {
      const hooks = new Map<HookPhase, Hook[]>([
        ['preExecuteTransaction', [makeHook({ breakFlow: true, result: {} })]],
      ]);
      await cmd.execute(makeArgs(hooks));
      expect(cmd.executeTransaction).not.toHaveBeenCalled();
    });

    it('does not call outputPreparation when preOutputPreparation breaks', async () => {
      const hooks = new Map<HookPhase, Hook[]>([
        ['preOutputPreparation', [makeHook({ breakFlow: true, result: {} })]],
      ]);
      await cmd.execute(makeArgs(hooks));
      expect(cmd.outputPreparation).not.toHaveBeenCalled();
    });

    it('returns postOutputPreparation hook result instead of outputPreparation result', async () => {
      const hookOutput: CommandResult = { result: { fromPostHook: true } };
      const hooks = new Map<HookPhase, Hook[]>([
        [
          'postOutputPreparation',
          [makeHook({ breakFlow: true, result: hookOutput.result })],
        ],
      ]);
      const result = await cmd.execute(makeArgs(hooks));
      expect(result.result).toEqual(hookOutput.result);
    });

    it('still calls outputPreparation before postOutputPreparation runs', async () => {
      const hooks = new Map<HookPhase, Hook[]>([
        [
          'postOutputPreparation',
          [makeHook({ breakFlow: true, result: {} })],
        ],
      ]);
      await cmd.execute(makeArgs(hooks));
      expect(cmd.outputPreparation).toHaveBeenCalledTimes(1);
    });
  });

  describe('hook receives correct params', () => {
    it('preParamsNormalization hook receives commandName and args', async () => {
      const hook = makeHook({ breakFlow: false });
      const hooks = new Map<HookPhase, Hook[]>([
        ['preParamsNormalization', [hook]],
      ]);
      const args = makeArgs(hooks);

      await cmd.execute(args);

      expect(hook.execute).toHaveBeenCalledWith(
        expect.objectContaining({ commandName: 'test-command', args }),
      );
    });

    it('preBuildTransaction hook receives normalisedParams', async () => {
      const hook = makeHook({ breakFlow: false });
      const hooks = new Map<HookPhase, Hook[]>([
        ['preBuildTransaction', [hook]],
      ]);
      const args = makeArgs(hooks);

      await cmd.execute(args);

      expect(hook.execute).toHaveBeenCalledWith(
        expect.objectContaining({ normalisedParams: defaultResults.params }),
      );
    });

    it('preSignTransaction hook receives buildTransactionResult', async () => {
      const hook = makeHook({ breakFlow: false });
      const hooks = new Map<HookPhase, Hook[]>([
        ['preSignTransaction', [hook]],
      ]);
      const args = makeArgs(hooks);

      await cmd.execute(args);

      expect(hook.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          buildTransactionResult: defaultResults.built,
        }),
      );
    });

    it('preExecuteTransaction hook receives signTransactionResult', async () => {
      const hook = makeHook({ breakFlow: false });
      const hooks = new Map<HookPhase, Hook[]>([
        ['preExecuteTransaction', [hook]],
      ]);
      const args = makeArgs(hooks);

      await cmd.execute(args);

      expect(hook.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          signTransactionResult: defaultResults.signed,
        }),
      );
    });

    it('postOutputPreparation hook receives outputResult', async () => {
      const hook = makeHook({ breakFlow: false });
      const hooks = new Map<HookPhase, Hook[]>([
        ['postOutputPreparation', [hook]],
      ]);
      const args = makeArgs(hooks);

      await cmd.execute(args);

      expect(hook.execute).toHaveBeenCalledWith(
        expect.objectContaining({ outputResult: defaultResults.output }),
      );
    });
  });

  describe('mapExecuteResultForHooks', () => {
    it('defaults to identity — hook receives the raw executeTransaction result', async () => {
      const hook = makeHook({ breakFlow: false });
      const hooks = new Map<HookPhase, Hook[]>([
        ['preOutputPreparation', [hook]],
      ]);
      const args = makeArgs(hooks);

      await cmd.execute(args);

      expect(hook.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          executeTransactionResult: defaultResults.executed,
        }),
      );
    });

    it('uses overridden mapExecuteResultForHooks value for hook params', async () => {
      class MappingCommand extends TestCommand {
        protected override mapExecuteResultForHooks(
          result: Executed,
        ): unknown {
          return { mapped: result.receipt };
        }
      }

      const mappingCmd = new MappingCommand('mapping-command');
      wireDefaults(mappingCmd);

      const hook = makeHook({ breakFlow: false });
      const hooks = new Map<HookPhase, Hook[]>([
        ['preOutputPreparation', [hook]],
      ]);
      const args = makeArgs(hooks);

      await mappingCmd.execute(args);

      expect(hook.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          executeTransactionResult: { mapped: defaultResults.executed.receipt },
        }),
      );
    });
  });

  describe('no hooks registered', () => {
    it('completes successfully with an empty hooks map', async () => {
      const args = makeArgs(new Map());
      const result = await cmd.execute(args);
      expect(result).toBe(defaultResults.output);
    });

    it('completes successfully when hooks property is absent', async () => {
      const args = makeArgs(undefined);
      const result = await cmd.execute(args);
      expect(result).toBe(defaultResults.output);
    });
  });
});

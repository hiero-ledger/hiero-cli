import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { HookPhase } from '@/core/hooks/types';
import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { CommandResult } from '@/core/plugins/plugin.types';

/**
 * Resolve the phase hook map from handler args (optional for tests / callers without hooks).
 */
export function resolveCommandHooks(
  args: CommandHandlerArgs,
): Map<HookPhase, Hook[]> {
  return args.hooks ?? new Map<HookPhase, Hook[]>();
}

/**
 * Execute all hooks registered at a specific phase, sequentially.
 * Stops and returns immediately if any hook returns { breakFlow: true }.
 */
export async function executePhaseHooks<TParams>(
  hooks: Map<HookPhase, Hook[]> | undefined,
  phase: HookPhase,
  params: TParams,
): Promise<HookResult> {
  const map: Map<HookPhase, Hook[]> = hooks ?? new Map<HookPhase, Hook[]>();
  const phaseHooks: Hook[] | undefined = map.get(phase);
  if (!phaseHooks || phaseHooks.length === 0) {
    return { breakFlow: false };
  }
  for (const hook of phaseHooks) {
    const hookResult: HookResult = await hook.execute(params);
    if (hookResult.breakFlow) {
      return hookResult;
    }
  }
  return { breakFlow: false };
}

/**
 * Convert a breakFlow HookResult into a CommandResult.
 */
export function processHookResult(
  hookResult: HookResult & { breakFlow: true },
): CommandResult {
  return {
    result: hookResult.result,
    overrideSchema: hookResult.schema,
    overrideHumanTemplate: hookResult.humanTemplate,
  };
}

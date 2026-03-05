import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { AbstractHook } from '@/core/hooks/abstract-hook';
import type {
  HookResult,
  PostCoreActionParams,
  PostOutputPreparationParams,
  PreCoreActionParams,
} from '@/core/hooks/types';

export abstract class BaseCommand<
  TNormalisedParams = unknown,
  TCoreActionResult = unknown,
> implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const preNormalizationHookResult =
      await this.preParamsNormalizationHook(args);
    if (preNormalizationHookResult && preNormalizationHookResult.breakFlow) {
      return {
        result: preNormalizationHookResult.result,
        humanTemplate: preNormalizationHookResult.humanTemplate,
      };
    }
    const normalisedParams = await this.normalizeParams(args);
    const preCoreHookResult = await this.preCoreActionHook(args, {
      normalisedParams,
    });
    if (preCoreHookResult && preCoreHookResult.breakFlow) {
      return {
        result: preCoreHookResult.result,
        humanTemplate: preCoreHookResult.humanTemplate,
      };
    }
    const coreActionResult = await this.coreAction(args, normalisedParams);
    const postCoreHookResult = await this.postCoreActionHook(args, {
      normalisedParams,
      coreActionResult,
    });
    if (postCoreHookResult && postCoreHookResult.breakFlow) {
      return {
        result: postCoreHookResult.result,
        humanTemplate: postCoreHookResult.humanTemplate,
      };
    }
    const result = await this.outputPreparation(
      args,
      normalisedParams,
      coreActionResult,
    );
    const postOutputHookResult = await this.postOutputPreparationHook(args, {
      normalisedParams,
      coreActionResult,
      outputResult: result,
    });
    if (postOutputHookResult && postOutputHookResult.breakFlow) {
      return {
        result: postOutputHookResult.result,
        humanTemplate: postOutputHookResult.humanTemplate,
      };
    }
    return result;
  }

  // Hooks
  async preParamsNormalizationHook(
    args: CommandHandlerArgs,
  ): Promise<HookResult | undefined> {
    return await this.executeHooks(
      async (h) => h.preParamsPreparationAndNormalizationHook(args),
      args.hooks,
    );
  }

  async preCoreActionHook(
    args: CommandHandlerArgs,
    params: PreCoreActionParams<TNormalisedParams>,
  ): Promise<HookResult | undefined> {
    return await this.executeHooks(
      async (h) => h.preCoreActionHook(args, params),
      args.hooks,
    );
  }

  async postCoreActionHook(
    args: CommandHandlerArgs,
    params: PostCoreActionParams<TNormalisedParams, TCoreActionResult>,
  ): Promise<HookResult | undefined> {
    return await this.executeHooks(
      async (h) => h.postCoreActionHook(args, params),
      args.hooks,
    );
  }

  async postOutputPreparationHook(
    args: CommandHandlerArgs,
    params: PostOutputPreparationParams<TNormalisedParams, TCoreActionResult>,
  ): Promise<HookResult | undefined> {
    return await this.executeHooks(
      async (h) => h.postOutputPreparationHook(args, params),
      args.hooks,
    );
  }

  /**
   * Generic hook execution method that executes hooks on all registered hooks.
   * Hook-agnostic: just awaits the hook executor without caring about the result.
   * @param hookExecutor - The hook function to execute on each hook.
   * @param hooks - abstract hooks list registered.
   */
  protected async executeHooks(
    hookExecutor: (hook: AbstractHook) => Promise<HookResult | undefined>,
    hooks?: AbstractHook[],
  ): Promise<HookResult | undefined> {
    if (!hooks) {
      return undefined;
    }

    for (const hook of hooks) {
      const hookResult = await hookExecutor(hook);
      if (hookResult && hookResult.breakFlow) {
        return hookResult;
      }
    }
    return undefined;
  }

  abstract normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TNormalisedParams>;
  abstract coreAction(
    args: CommandHandlerArgs,
    normalisedParams: TNormalisedParams,
  ): Promise<TCoreActionResult>;
  abstract outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: TNormalisedParams,
    coreActionResult?: TCoreActionResult,
  ): Promise<CommandResult>;
}

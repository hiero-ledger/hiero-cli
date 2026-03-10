import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { AbstractHook } from '@/core/hooks/abstract-hook';
import type {
  HookResult,
  PostOutputPreparationParams,
  PreBuildTransactionParams,
  PreExecuteTransactionParams,
  PreOutputPreparationParams,
  PreSignTransactionParams,
} from '@/core/hooks/types';

export abstract class BaseTransactionCommand<
  TNormalisedParams = unknown,
  TBuildTransactionResult = unknown,
  TSignTransactionResult = unknown,
  TExecuteTransactionResult = unknown,
> implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const preNormalizationHookResult =
      await this.preParamsNormalizationHook(args);
    if (preNormalizationHookResult.breakFlow) {
      return this.processHookResult(preNormalizationHookResult);
    }
    const normalisedParams = await this.normalizeParams(args);

    const preBuildTransactionHookResult = await this.preBuildTransactionHook(
      args,
      { normalisedParams },
    );
    if (preBuildTransactionHookResult.breakFlow) {
      return this.processHookResult(preBuildTransactionHookResult);
    }
    const buildTransactionResult = await this.buildTransaction(
      args,
      normalisedParams,
    );

    const preSignTransactionHookResult = await this.preSignTransactionHook(
      args,
      { normalisedParams, buildTransactionResult },
    );
    if (preSignTransactionHookResult.breakFlow) {
      return this.processHookResult(preSignTransactionHookResult);
    }
    const signTransactionResult = await this.signTransaction(
      args,
      normalisedParams,
      buildTransactionResult,
    );

    const preExecuteTransactionHookResult =
      await this.preExecuteTransactionHook(args, {
        normalisedParams,
        buildTransactionResult,
        signTransactionResult,
      });
    if (preExecuteTransactionHookResult.breakFlow) {
      return this.processHookResult(preExecuteTransactionHookResult);
    }
    const executeTransactionResult = await this.executeTransaction(
      args,
      normalisedParams,
      buildTransactionResult,
      signTransactionResult,
    );
    const postExecuteTransactionHookResult =
      await this.postExecuteTransactionHook(args, {
        normalisedParams,
        buildTransactionResult,
        signTransactionResult,
        executeTransactionResult,
      });
    if (postExecuteTransactionHookResult.breakFlow) {
      return this.processHookResult(postExecuteTransactionHookResult);
    }
    const result = await this.outputPreparation(
      args,
      normalisedParams,
      buildTransactionResult,
      signTransactionResult,
      executeTransactionResult,
    );
    const postOutputHookResult = await this.postOutputPreparationHook(args, {
      normalisedParams,
      buildTransactionResult,
      signTransactionResult,
      executeTransactionResult,
      outputResult: result,
    });
    if (postOutputHookResult.breakFlow) {
      return this.processHookResult(postOutputHookResult);
    }
    return result;
  }

  // Hooks
  async preParamsNormalizationHook(
    args: CommandHandlerArgs,
  ): Promise<HookResult> {
    return await this.executeHooks(
      async (h) => h.preParamsPreparationAndNormalizationHook(args),
      args.hooks,
    );
  }

  async preBuildTransactionHook(
    args: CommandHandlerArgs,
    params: PreBuildTransactionParams<TNormalisedParams>,
  ): Promise<HookResult> {
    return await this.executeHooks(
      async (h) => h.preBuildTransactionHook(args, params),
      args.hooks,
    );
  }

  async preSignTransactionHook(
    args: CommandHandlerArgs,
    params: PreSignTransactionParams<
      TNormalisedParams,
      TBuildTransactionResult
    >,
  ): Promise<HookResult> {
    return await this.executeHooks(
      async (h) => h.preSignTransactionHook(args, params),
      args.hooks,
    );
  }

  async preExecuteTransactionHook(
    args: CommandHandlerArgs,
    params: PreExecuteTransactionParams<
      TNormalisedParams,
      TBuildTransactionResult,
      TSignTransactionResult
    >,
  ): Promise<HookResult> {
    return await this.executeHooks(
      async (h) => h.preExecuteTransactionHook(args, params),
      args.hooks,
    );
  }

  async postExecuteTransactionHook(
    args: CommandHandlerArgs,
    params: PreOutputPreparationParams<
      TNormalisedParams,
      TBuildTransactionResult,
      TSignTransactionResult,
      TExecuteTransactionResult
    >,
  ): Promise<HookResult> {
    return await this.executeHooks(
      async (h) => h.preOutputPreparationHook(args, params),
      args.hooks,
    );
  }

  async postOutputPreparationHook(
    args: CommandHandlerArgs,
    params: PostOutputPreparationParams<
      TNormalisedParams,
      TBuildTransactionResult,
      TSignTransactionResult,
      TExecuteTransactionResult
    >,
  ): Promise<HookResult> {
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
    hookExecutor: (hook: AbstractHook) => Promise<HookResult>,
    hooks?: AbstractHook[],
  ): Promise<HookResult> {
    if (!hooks) {
      return {
        breakFlow: false,
        result: {
          message: 'no hooks available',
        },
      };
    }

    for (const hook of hooks) {
      const hookResult = await hookExecutor(hook);
      if (hookResult.breakFlow) {
        return hookResult;
      }
    }
    return {
      breakFlow: false,
      result: {
        message: 'success',
      },
    };
  }

  protected async processHookResult(
    hookResult: HookResult,
  ): Promise<CommandResult> {
    return Promise.resolve({
      result: hookResult.result,
      overrideSchema: hookResult.schema,
      overrideHumanTemplate: hookResult.humanTemplate,
    });
  }

  abstract normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<TNormalisedParams>;

  abstract buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TNormalisedParams,
  ): Promise<TBuildTransactionResult>;

  abstract signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TNormalisedParams,
    buildTransactionResult: TBuildTransactionResult,
  ): Promise<TSignTransactionResult>;

  abstract executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TNormalisedParams,
    buildTransactionResult: TBuildTransactionResult,
    signTransactionResult: TSignTransactionResult,
  ): Promise<TExecuteTransactionResult>;

  abstract outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: TNormalisedParams,
    buildTransactionResult: TBuildTransactionResult,
    signTransactionResult: TSignTransactionResult,
    coreActionResult: TExecuteTransactionResult,
  ): Promise<CommandResult>;
}

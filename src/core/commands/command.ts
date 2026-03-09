import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { AbstractHook } from '@/core/hooks/abstract-hook';
import type {
  HookResult,
  PostExecuteTransactionParams,
  PostOutputPreparationParams,
  PreBuildAndSignParams,
  PreExecuteTransactionParams,
} from '@/core/hooks/types';

export abstract class BaseTransactionCommand<
  TNormalisedParams = unknown,
  TBuildAndSignResult = unknown,
  TTransactionExecutionResult = unknown,
> implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const preNormalizationHookResult =
      await this.preParamsNormalizationHook(args);
    if (preNormalizationHookResult.breakFlow) {
      return this.processHookResult(preNormalizationHookResult);
    }
    const normalisedParams = await this.normalizeParams(args);

    const preBuildAndSignHookResult = await this.preBuildAndSignHook(args, {
      normalisedParams,
    });
    if (preBuildAndSignHookResult.breakFlow) {
      return this.processHookResult(preBuildAndSignHookResult);
    }
    const buildAndSignResult = await this.buildAndSign(args, normalisedParams);

    const preExecuteTransactionHookResult =
      await this.preExecuteTransactionHook(args, {
        normalisedParams,
        buildAndSignResult,
      });
    if (preExecuteTransactionHookResult.breakFlow) {
      return this.processHookResult(preExecuteTransactionHookResult);
    }
    const coreActionResult = await this.executeTransaction(
      args,
      normalisedParams,
      buildAndSignResult,
    );
    const postExecuteTransactionHookResult =
      await this.postExecuteTransactionHook(args, {
        normalisedParams,
        buildAndSignResult,
        coreActionResult,
      });
    if (postExecuteTransactionHookResult.breakFlow) {
      return this.processHookResult(postExecuteTransactionHookResult);
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

  async preBuildAndSignHook(
    args: CommandHandlerArgs,
    params: PreBuildAndSignParams<TNormalisedParams>,
  ): Promise<HookResult> {
    return await this.executeHooks(
      async (h) => h.preBuildAndSignHook(args, params),
      args.hooks,
    );
  }

  async preExecuteTransactionHook(
    args: CommandHandlerArgs,
    params: PreExecuteTransactionParams<TNormalisedParams, TBuildAndSignResult>,
  ): Promise<HookResult> {
    return await this.executeHooks(
      async (h) => h.preExecuteTransactionHook(args, params),
      args.hooks,
    );
  }

  async postExecuteTransactionHook(
    args: CommandHandlerArgs,
    params: PostExecuteTransactionParams<
      TNormalisedParams,
      TBuildAndSignResult,
      TTransactionExecutionResult
    >,
  ): Promise<HookResult> {
    return await this.executeHooks(
      async (h) => h.postExecuteTransactionHook(args, params),
      args.hooks,
    );
  }

  async postOutputPreparationHook(
    args: CommandHandlerArgs,
    params: PostOutputPreparationParams<
      TNormalisedParams,
      TTransactionExecutionResult
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

  abstract buildAndSign(
    args: CommandHandlerArgs,
    normalisedParams: TNormalisedParams,
  ): Promise<TBuildAndSignResult>;

  abstract executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: TNormalisedParams,
    buildAndSignResult: TBuildAndSignResult,
  ): Promise<TTransactionExecutionResult>;

  abstract outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: TNormalisedParams,
    transactionExecutionResult?: TTransactionExecutionResult,
  ): Promise<CommandResult>;
}

import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { AbstractHook } from '@/core/hooks/abstract-hook';
import type {
  PostCoreActionParams,
  PostOutputPreparationParams,
  PostParamsPreparationAndNormalizationParams,
  PreCoreActionParams,
  PreOutputPreparationParams,
} from '@/core/hooks/types';
import type { Context } from '@/core/shared/context/context';

export abstract class BaseCommand<
  TNormalisedParams = unknown,
  TCoreActionResult = unknown,
> implements Command {
  async execute(args: CommandHandlerArgs, context: Context) {
    this.preParamsNormalizationHook(args, context);
    const normalisedParams = await this.normalizeParams(args, context);
    this.postParamsNormalizationHook(args, context, {
      normalisedParams,
    });
    this.preCoreActionHook(args, context, {
      normalisedParams,
    });
    let coreActionResult;
    if (context.coreActionEnabled) {
      coreActionResult = await this.coreAction(args, context, normalisedParams);
    }
    this.postCoreActionHook(args, context, {
      normalisedParams,
      coreActionResult,
    });
    this.preOutputPreparationHook(args, context, {
      normalisedParams,
      coreActionResult,
    });
    const result = await this.outputPreparation(
      args,
      context,
      normalisedParams,
      coreActionResult,
    );
    this.postOutputPreparationHook(args, context, {
      normalisedParams,
      coreActionResult,
      outputResult: result,
    });
    return result;
  }

  // Hooks
  async preParamsNormalizationHook(
    args: CommandHandlerArgs,
    context: Context,
  ): Promise<void> {
    await this.executeHooks(context, async (h) =>
      h.preParamsPreparationAndNormalizationHook(args, context),
    );
  }

  async postParamsNormalizationHook(
    args: CommandHandlerArgs,
    context: Context,
    params: PostParamsPreparationAndNormalizationParams<TNormalisedParams>,
  ): Promise<void> {
    await this.executeHooks(context, async (h) =>
      h.postParamsPreparationAndNormalizationHook(args, context, params),
    );
  }

  async preCoreActionHook(
    args: CommandHandlerArgs,
    context: Context,
    params: PreCoreActionParams<TNormalisedParams>,
  ): Promise<void> {
    await this.executeHooks(context, async (h) =>
      h.preCoreActionHook(args, context, params),
    );
  }

  async postCoreActionHook(
    args: CommandHandlerArgs,
    context: Context,
    params: PostCoreActionParams<TNormalisedParams, TCoreActionResult>,
  ): Promise<void> {
    await this.executeHooks(context, async (h) =>
      h.postCoreActionHook(args, context, params),
    );
  }

  async preOutputPreparationHook(
    args: CommandHandlerArgs,
    context: Context,
    params: PreOutputPreparationParams<TNormalisedParams, TCoreActionResult>,
  ): Promise<void> {
    await this.executeHooks(context, async (h) =>
      h.preOutputPreparationHook(args, context, params),
    );
  }

  async postOutputPreparationHook(
    args: CommandHandlerArgs,
    context: Context,
    params: PostOutputPreparationParams<TNormalisedParams, TCoreActionResult>,
  ): Promise<void> {
    await this.executeHooks(context, async (h) =>
      h.postOutputPreparationHook(args, context, params),
    );
  }

  /**
   * Generic hook execution method that executes hooks on all registered hooks.
   * Hook-agnostic: just awaits the hook executor without caring about the result.
   * @param context - The execution context.
   * @param hookExecutor - The hook function to execute on each hook.
   */
  protected async executeHooks(
    context: Context,
    hookExecutor: (hook: AbstractHook) => Promise<void>,
  ): Promise<void> {
    if (!context.hooks) {
      return;
    }

    for (const hook of context.hooks) {
      await hookExecutor(hook);
    }
  }

  abstract normalizeParams(
    args: CommandHandlerArgs,
    context: Context,
  ): Promise<TNormalisedParams>;
  abstract coreAction(
    args: CommandHandlerArgs,
    context: Context,
    normalisedParams: TNormalisedParams,
  ): Promise<TCoreActionResult>;
  abstract outputPreparation(
    args: CommandHandlerArgs,
    context: Context,
    normalisedParams: TNormalisedParams,
    coreActionResult?: TCoreActionResult,
  ): Promise<CommandResult>;
}

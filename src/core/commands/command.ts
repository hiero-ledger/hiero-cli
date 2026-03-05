import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { AbstractHook } from '@/core/hooks/abstract-hook';
import type {
  PostCoreActionParams,
  PostOutputPreparationParams,
  PreCoreActionParams,
} from '@/core/hooks/types';

export abstract class BaseCommand<
  TNormalisedParams = unknown,
  TCoreActionResult = unknown,
> implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    await this.preParamsNormalizationHook(args);
    const normalisedParams = await this.normalizeParams(args);
    await this.preCoreActionHook(args, {
      normalisedParams,
    });
    let coreActionResult;
    // if (context.coreActionEnabled) {
    coreActionResult = await this.coreAction(args, normalisedParams);
    // }
    await this.postCoreActionHook(args, {
      normalisedParams,
      coreActionResult,
    });
    const result = await this.outputPreparation(
      args,
      normalisedParams,
      coreActionResult,
    );
    this.postOutputPreparationHook(args, {
      normalisedParams,
      coreActionResult,
      outputResult: result,
    });
    return result;
  }

  // Hooks
  async preParamsNormalizationHook(args: CommandHandlerArgs): Promise<void> {
    await this.executeHooks(
      async (h) => h.preParamsPreparationAndNormalizationHook(args),
      args.hooks,
    );
  }

  async preCoreActionHook(
    args: CommandHandlerArgs,
    params: PreCoreActionParams<TNormalisedParams>,
  ): Promise<void> {
    await this.executeHooks(
      async (h) => h.preCoreActionHook(args, params),
      args.hooks,
    );
  }

  async postCoreActionHook(
    args: CommandHandlerArgs,
    params: PostCoreActionParams<TNormalisedParams, TCoreActionResult>,
  ): Promise<void> {
    await this.executeHooks(
      async (h) => h.postCoreActionHook(args, params),
      args.hooks,
    );
  }

  async postOutputPreparationHook(
    args: CommandHandlerArgs,
    params: PostOutputPreparationParams<TNormalisedParams, TCoreActionResult>,
  ): Promise<void> {
    await this.executeHooks(
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
    hookExecutor: (hook: AbstractHook) => Promise<void>,
    hooks?: AbstractHook[],
  ): Promise<void> {
    if (!hooks) {
      return;
    }

    for (const hook of hooks) {
      await hookExecutor(hook);
    }
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

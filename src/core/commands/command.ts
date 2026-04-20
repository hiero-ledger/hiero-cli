import type { Command } from '@/core/commands/command.interface';
import type {
  PostOutputPreparationHookParams,
  PreBuildTransactionHookParams,
  PreExecuteTransactionHookParams,
  PreOutputPreparationHookParams,
  PreParamsNormalizationHookParams,
  PreSignTransactionHookParams,
} from '@/core/hooks/types';
import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { CommandResult } from '@/core/plugins/plugin.types';

import {
  executePhaseHooks,
  processHookResult,
  resolveCommandHooks,
} from '@/core/hooks/hook-executor';

export abstract class BaseTransactionCommand<
  TNormalisedParams = unknown,
  TBuildTransactionResult = unknown,
  TSignTransactionResult = unknown,
  TExecuteTransactionResult = unknown,
> implements Command {
  private commandName: string;

  constructor(commandName: string) {
    this.commandName = commandName;
  }

  /**
   * Map execute result for hook phases that receive `executeTransactionResult`
   * (pre/post output preparation). Orchestrator commands wrap with a
   * discriminated union for state hooks; default is identity.
   */
  protected mapExecuteResultForHooks(
    executeTransactionResult: TExecuteTransactionResult,
  ): unknown {
    return executeTransactionResult;
  }

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const hooks = resolveCommandHooks(args);

    const preNormResult = await executePhaseHooks(
      hooks,
      'preParamsNormalization',
      {
        args,
        commandName: this.commandName,
      } satisfies PreParamsNormalizationHookParams,
    );
    if (preNormResult.breakFlow) {
      return processHookResult(preNormResult);
    }
    const normalisedParams = await this.normalizeParams(args);

    const preBuildResult = await executePhaseHooks(
      hooks,
      'preBuildTransaction',
      {
        args,
        commandName: this.commandName,
        normalisedParams,
      } satisfies PreBuildTransactionHookParams<TNormalisedParams>,
    );
    if (preBuildResult.breakFlow) {
      return processHookResult(preBuildResult);
    }
    const buildTransactionResult = await this.buildTransaction(
      args,
      normalisedParams,
    );

    const preSignResult = await executePhaseHooks(hooks, 'preSignTransaction', {
      args,
      commandName: this.commandName,
      normalisedParams,
      buildTransactionResult,
    } satisfies PreSignTransactionHookParams<
      TNormalisedParams,
      TBuildTransactionResult
    >);
    if (preSignResult.breakFlow) {
      return processHookResult(preSignResult);
    }
    const signTransactionResult = await this.signTransaction(
      args,
      normalisedParams,
      buildTransactionResult,
    );

    const preExecResult = await executePhaseHooks(
      hooks,
      'preExecuteTransaction',
      {
        args,
        commandName: this.commandName,
        normalisedParams,
        buildTransactionResult,
        signTransactionResult,
      } satisfies PreExecuteTransactionHookParams<
        TNormalisedParams,
        TBuildTransactionResult,
        TSignTransactionResult
      >,
    );
    if (preExecResult.breakFlow) {
      return processHookResult(preExecResult);
    }
    const executeTransactionResult = await this.executeTransaction(
      args,
      normalisedParams,
      buildTransactionResult,
      signTransactionResult,
    );

    const executeForHooks = this.mapExecuteResultForHooks(
      executeTransactionResult,
    );

    const preOutputResult = await executePhaseHooks(
      hooks,
      'preOutputPreparation',
      {
        args,
        commandName: this.commandName,
        normalisedParams,
        buildTransactionResult,
        signTransactionResult,
        executeTransactionResult: executeForHooks,
      } satisfies PreOutputPreparationHookParams<
        TNormalisedParams,
        TBuildTransactionResult,
        TSignTransactionResult,
        unknown
      >,
    );
    if (preOutputResult.breakFlow) {
      return processHookResult(preOutputResult);
    }
    const result = await this.outputPreparation(
      args,
      normalisedParams,
      buildTransactionResult,
      signTransactionResult,
      executeTransactionResult,
    );

    const postOutputResult = await executePhaseHooks(
      hooks,
      'postOutputPreparation',
      {
        args,
        commandName: this.commandName,
        normalisedParams,
        buildTransactionResult,
        signTransactionResult,
        executeTransactionResult: executeForHooks,
        outputResult: result,
      } satisfies PostOutputPreparationHookParams<
        TNormalisedParams,
        TBuildTransactionResult,
        TSignTransactionResult,
        unknown
      >,
    );
    if (postOutputResult.breakFlow) {
      return processHookResult(postOutputResult);
    }
    return result;
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

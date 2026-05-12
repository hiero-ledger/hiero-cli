import type { CommandResult } from '@/core';
import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

export type { HookResult } from '@/core/hooks/hook.interface';

export type HookPhase =
  | 'preParamsNormalization'
  | 'preBuildTransaction'
  | 'preSignTransaction'
  | 'preExecuteTransaction'
  | 'preOutputPreparation'
  | 'postOutputPreparation';

export interface PreParamsNormalizationHookParams {
  args: CommandHandlerArgs;
  commandName: string;
}

export interface PreBuildTransactionHookParams<TNormalisedParams = unknown> {
  args: CommandHandlerArgs;
  commandName: string;
  normalisedParams: TNormalisedParams;
}

export interface PreSignTransactionHookParams<
  TNormalisedParams = unknown,
  TBuildTransactionResult = unknown,
> {
  args: CommandHandlerArgs;
  commandName: string;
  normalisedParams: TNormalisedParams;
  buildTransactionResult: TBuildTransactionResult;
}

export interface PreExecuteTransactionHookParams<
  TNormalisedParams = unknown,
  TBuildTransactionResult = unknown,
  TSignTransactionResult = unknown,
> {
  args: CommandHandlerArgs;
  commandName: string;
  normalisedParams: TNormalisedParams;
  buildTransactionResult: TBuildTransactionResult;
  signTransactionResult: TSignTransactionResult;
}

export interface PreOutputPreparationHookParams<
  TNormalisedParams = unknown,
  TBuildTransactionResult = unknown,
  TSignTransactionResult = unknown,
  TExecuteTransactionResult = unknown,
> {
  args: CommandHandlerArgs;
  commandName: string;
  normalisedParams: TNormalisedParams;
  buildTransactionResult: TBuildTransactionResult;
  signTransactionResult: TSignTransactionResult;
  executeTransactionResult: TExecuteTransactionResult;
}

export interface PostOutputPreparationHookParams<
  TNormalisedParams = unknown,
  TBuildTransactionResult = unknown,
  TSignTransactionResult = unknown,
  TExecuteTransactionResult = unknown,
> {
  args: CommandHandlerArgs;
  commandName: string;
  normalisedParams: TNormalisedParams;
  buildTransactionResult: TBuildTransactionResult;
  signTransactionResult: TSignTransactionResult;
  executeTransactionResult: TExecuteTransactionResult;
  outputResult: CommandResult;
}

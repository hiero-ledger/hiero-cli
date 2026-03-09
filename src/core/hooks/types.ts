import type { z } from 'zod';
import type { CommandResult } from '@/core';

export interface PreBuildTransactionParams<TNormalisedParams = unknown> {
  normalisedParams: TNormalisedParams;
}

export interface PreSignTransactionParams<
  TNormalisedParams = unknown,
  TBuildTransactionResult = unknown,
> {
  normalisedParams: TNormalisedParams;
  buildTransactionResult: TBuildTransactionResult;
}

export interface PreExecuteTransactionParams<
  TNormalisedParams = unknown,
  TBuildTransactionResult = unknown,
  TSignTransactionResult = unknown,
> {
  normalisedParams: TNormalisedParams;
  buildTransactionResult: TBuildTransactionResult;
  signTransactionResult: TSignTransactionResult;
}

export interface PostExecuteTransactionParams<
  TNormalisedParams = unknown,
  TBuildTransactionResult = unknown,
  TSignTransactionResult = unknown,
  TExecuteTransactionResult = unknown,
> {
  normalisedParams: TNormalisedParams;
  buildTransactionResult: TBuildTransactionResult;
  signTransactionResult: TSignTransactionResult;
  executeTransactionResult: TExecuteTransactionResult;
}

export interface PostOutputPreparationParams<
  TNormalisedParams = unknown,
  TBuildTransactionResult = unknown,
  TSignTransactionResult = unknown,
  TExecuteTransactionResult = unknown,
> {
  normalisedParams: TNormalisedParams;
  buildTransactionResult: TBuildTransactionResult;
  signTransactionResult: TSignTransactionResult;
  executeTransactionResult: TExecuteTransactionResult;
  outputResult: CommandResult;
}

export interface HookResult {
  breakFlow: boolean;
  result: object;
  schema?: z.ZodTypeAny;
  humanTemplate?: string;
}

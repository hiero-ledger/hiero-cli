import type { CommandResult } from '@/core';

export interface PreBuildAndSignParams<TNormalisedParams = unknown> {
  normalisedParams: TNormalisedParams;
}

export interface PreExecuteTransactionParams<
  TNormalisedParams = unknown,
  TBuildAndSignResult = unknown,
> {
  normalisedParams: TNormalisedParams;
  buildAndSignResult?: TBuildAndSignResult;
}

export interface PostExecuteTransactionParams<
  TNormalisedParams = unknown,
  TBuildAndSignResult = unknown,
  TCoreActionResult = unknown,
> {
  normalisedParams: TNormalisedParams;
  buildAndSignResult?: TBuildAndSignResult;
  coreActionResult?: TCoreActionResult;
}

export interface PostOutputPreparationParams<
  TNormalisedParams = unknown,
  TCoreActionResult = unknown,
> {
  normalisedParams: TNormalisedParams;
  coreActionResult?: TCoreActionResult;
  outputResult: CommandResult;
}

export interface HookResult {
  breakFlow: boolean;
  result: object;
  humanTemplate?: string;
}

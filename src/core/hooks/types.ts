import type { CommandResult } from '@/core';

export interface PreCoreActionParams<TNormalisedParams = unknown> {
  normalisedParams: TNormalisedParams;
}

export interface PostCoreActionParams<
  TNormalisedParams = unknown,
  TCoreActionResult = unknown,
> {
  normalisedParams: TNormalisedParams;
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

import type { CommandResult } from '@/core';

export interface PostParamsPreparationAndNormalizationParams<
  TNormalisedParams = unknown,
> {
  normalisedParams: TNormalisedParams;
}

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

export interface PreOutputPreparationParams<
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

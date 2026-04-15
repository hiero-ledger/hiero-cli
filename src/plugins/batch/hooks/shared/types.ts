import type { BaseNormalizedParams } from '@/core';

export interface BatchifyHookBaseParams extends BaseNormalizedParams {
  [key: string]: unknown;
}

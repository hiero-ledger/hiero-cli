import type { BatchifyNormalizedParams } from '@/core';

export interface BatchifyHookBaseParams extends BatchifyNormalizedParams {
  [key: string]: unknown;
}

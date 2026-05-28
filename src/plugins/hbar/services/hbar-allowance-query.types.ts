import type { HbarAllowanceInfo } from '@/core/services/mirrornode/types';

export interface HbarAllowanceFetchResult {
  allowances: HbarAllowanceInfo[];
  hasMore: boolean;
}

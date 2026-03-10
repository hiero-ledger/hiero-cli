import type { AccountResponse } from '@/core/services/mirrornode/types';

export interface ViewAccountNormalisedParams {
  accountId: string;
  network: string;
}

export type ViewAccountBuildTransactionResult = Record<string, never>;
export type ViewAccountSignTransactionResult = Record<string, never>;
export type ViewAccountExecuteTransactionResult = AccountResponse;

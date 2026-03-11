import type { AccountResponse } from '@/core/services/mirrornode/types';
import type { SupportedNetwork } from '@/core/types/shared.types';

export interface ViewAccountNormalisedParams {
  accountId: string;
  network: SupportedNetwork;
}

export type ViewAccountBuildTransactionResult = Record<string, never>;
export type ViewAccountSignTransactionResult = Record<string, never>;
export type ViewAccountExecuteTransactionResult = AccountResponse;

import type { SupportedNetwork } from '@/core/types/shared.types';
import type { AccountData } from '@/plugins/account/schema';

export interface DeleteAccountNormalisedParams {
  accountRef: string;
  key: string;
  network: SupportedNetwork;
  accountToDelete: AccountData;
}

export type DeleteAccountBuildTransactionResult = Record<string, never>;
export type DeleteAccountSignTransactionResult = Record<string, never>;

export interface DeleteAccountExecuteTransactionResult {
  removedAliases: string[];
}

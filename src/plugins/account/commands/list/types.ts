import type { AccountData } from '@/plugins/account/schema';

export interface ListAccountsNormalisedParams {
  showPrivateKeys: boolean;
}

export type ListAccountsBuildTransactionResult = Record<string, never>;
export type ListAccountsSignTransactionResult = Record<string, never>;

export interface ListAccountsExecuteTransactionResult {
  accounts: AccountData[];
}

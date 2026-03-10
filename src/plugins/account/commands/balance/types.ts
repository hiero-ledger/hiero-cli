import type { TokenBalanceWithMetadata } from '@/plugins/account/utils/balance-helpers';

export interface AccountBalanceNormalisedParams {
  accountId: string;
  hbarOnly: boolean;
  tokenOnly: boolean;
  raw: boolean;
  network: string;
  tokenId: string | undefined;
}

export type AccountBalanceBuildTransactionResult = Record<string, never>;
export type AccountBalanceSignTransactionResult = Record<string, never>;

export interface AccountBalanceExecuteTransactionResult {
  hbarBalance: bigint | undefined;
  hbarBalanceDisplay: string | undefined;
  tokenBalances: TokenBalanceWithMetadata[] | undefined;
}

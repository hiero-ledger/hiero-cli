import type { SupportedNetwork } from '@/core/types/shared.types';

export interface TokenBalanceWithMetadata {
  tokenId: string;
  name?: string;
  symbol?: string;
  alias?: string;
  balance: bigint;
  balanceDisplay?: string;
  decimals?: number;
}

export interface NftCollectionBalance {
  tokenId: string;
  name?: string;
  symbol?: string;
  alias?: string;
  serialNumbers: number[];
  count: number;
}

export interface NftBalancesResult {
  collections: NftCollectionBalance[];
  totalCount: number;
  truncated: boolean;
}

export interface AccountBalanceService {
  fetchTokenBalances(
    accountId: string,
    tokenId: string | undefined,
    raw: boolean,
    network: SupportedNetwork,
  ): Promise<TokenBalanceWithMetadata[] | undefined>;
  fetchNftBalances(
    accountId: string,
    tokenId: string | undefined,
    network: SupportedNetwork,
  ): Promise<NftBalancesResult | undefined>;
}

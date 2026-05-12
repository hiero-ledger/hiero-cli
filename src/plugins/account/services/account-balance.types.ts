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

import type {
  NftAllowanceInfo,
  TokenAllowanceInfo,
} from '@/core/services/mirrornode/types';

export interface TokenAllowanceFtFetchResult {
  allowances: TokenAllowanceInfo[];
  hasMore: boolean;
}

export interface TokenAllowanceNftFetchResult {
  allowances: NftAllowanceInfo[];
  hasMore: boolean;
}

export interface NftAllowanceGroup {
  tokenId: string;
  spenderAccountId: string;
  approvedForAll: boolean;
  serialNumbers: Set<number>;
}

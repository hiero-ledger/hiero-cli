import type { AccountReference } from '@/core/schemas/common-schemas';
import type {
  NftAllowanceInfo,
  TokenAllowanceInfo,
} from '@/core/services/mirrornode/types';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { FtTokenMetadata, NftTokenMetadata } from '@/plugins/token/types';

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

export interface TokenAllowanceQueryService {
  resolveAccountId(
    account: AccountReference,
    network: SupportedNetwork,
  ): Promise<string>;
  resolveOptionalSpender(
    spender: AccountReference | undefined,
    network: SupportedNetwork,
  ): Promise<string | undefined>;
  fetchFtAllowances(
    accountId: string,
    showAll: boolean,
  ): Promise<TokenAllowanceFtFetchResult>;
  fetchNftAllowances(
    accountId: string,
    showAll: boolean,
  ): Promise<TokenAllowanceNftFetchResult>;
  fetchFtTokenInfoMap(
    allowances: TokenAllowanceInfo[],
    raw: boolean,
  ): Promise<Map<string, FtTokenMetadata>>;
  fetchNftTokenInfoMap(
    groups: NftAllowanceGroup[],
    raw: boolean,
  ): Promise<Map<string, NftTokenMetadata>>;
}

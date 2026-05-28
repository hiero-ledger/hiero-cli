import type { AccountReference } from '@/core/schemas/common-schemas';
import type { TokenAllowanceInfo } from '@/core/services/mirrornode/types';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type {
  NftAllowanceGroup,
  TokenAllowanceFtFetchResult,
  TokenAllowanceNftFetchResult,
} from '@/plugins/token/services/token-allowance-query.types';
import type { FtTokenMetadata, NftTokenMetadata } from '@/plugins/token/types';

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

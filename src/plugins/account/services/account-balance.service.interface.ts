import type { SupportedNetwork } from '@/core/types/shared.types';
import type {
  NftBalancesResult,
  TokenBalanceWithMetadata,
} from './account-balance.types';

export type {
  NftBalancesResult,
  NftCollectionBalance,
  TokenBalanceWithMetadata,
} from './account-balance.types';

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

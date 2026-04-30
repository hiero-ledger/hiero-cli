import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { TokenBalanceInfo } from '@/core/services/mirrornode/types';
import type { SupportedNetwork } from '@/core/types/shared.types';

import BigNumber from 'bignumber.js';

import { MirrorNodeTokenType } from '@/core/services/mirrornode/types';
import { NFT_BALANCE_PAGE_SIZE } from '@/core/shared/constants';
import { AliasType } from '@/core/types/shared.types';
import { normalizeBalance } from '@/core/utils/normalize-balance';

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

export async function fetchAccountTokenBalances(
  api: CoreApi,
  accountId: string,
  tokenId: string | undefined,
  raw: boolean,
  network: SupportedNetwork,
): Promise<TokenBalanceWithMetadata[] | undefined> {
  const tokenBalances = await api.mirror.getAccountTokenBalances(
    accountId,
    tokenId,
  );

  if (!tokenBalances.tokens?.length) {
    return undefined;
  }

  const results = await Promise.all(
    tokenBalances.tokens.map(
      async (
        token: TokenBalanceInfo,
      ): Promise<TokenBalanceWithMetadata | null> => {
        const balanceRaw = BigInt(token.balance.toString());
        const alias = api.alias.resolve(
          token.token_id,
          AliasType.Token,
          network,
        )?.alias;

        const info = await api.mirror
          .getTokenInfo(token.token_id)
          .catch(() => null);

        if (info?.type === MirrorNodeTokenType.NON_FUNGIBLE_UNIQUE) return null;

        const name = info?.name;
        const symbol = info?.symbol;
        const decimals = info ? parseInt(info.decimals, 10) : token.decimals;

        let balanceDisplay: string | undefined;
        if (!raw && decimals !== undefined) {
          balanceDisplay = normalizeBalance(
            new BigNumber(balanceRaw.toString()),
            decimals,
          );
        }

        return {
          tokenId: token.token_id,
          name,
          symbol,
          alias,
          balance: balanceRaw,
          balanceDisplay,
          decimals,
        };
      },
    ),
  );

  const filtered = results.filter(
    (t): t is TokenBalanceWithMetadata => t !== null,
  );
  return filtered.length > 0 ? filtered : undefined;
}

export async function fetchAccountNftBalances(
  api: CoreApi,
  accountId: string,
  tokenId: string | undefined,
  network: SupportedNetwork,
): Promise<NftBalancesResult | undefined> {
  const response = await api.mirror.getAccountNfts(
    accountId,
    NFT_BALANCE_PAGE_SIZE,
  );

  const nfts = tokenId
    ? response.nfts.filter((nft) => nft.token_id === tokenId)
    : response.nfts;

  if (nfts.length === 0) return undefined;

  const serialsByToken = new Map<string, number[]>();
  for (const nft of nfts) {
    const serials = serialsByToken.get(nft.token_id) ?? [];
    serialsByToken.set(nft.token_id, [...serials, nft.serial_number]);
  }

  const totalCount = nfts.length;
  const truncated = !!response.links?.next;

  const uniqueTokenIds = Array.from(serialsByToken.keys());
  const tokenInfoResults = await Promise.all(
    uniqueTokenIds.map(async (tid) => {
      const alias = api.alias.resolve(tid, AliasType.Token, network)?.alias;
      try {
        const info = await api.mirror.getTokenInfo(tid);
        return { tokenId: tid, name: info.name, symbol: info.symbol, alias };
      } catch {
        return { tokenId: tid, alias };
      }
    }),
  );

  const collections: NftCollectionBalance[] = tokenInfoResults.map((info) => {
    const serialNumbers = serialsByToken.get(info.tokenId) ?? [];
    return {
      tokenId: info.tokenId,
      name: info.name,
      symbol: info.symbol,
      alias: info.alias,
      serialNumbers,
      count: serialNumbers.length,
    };
  });

  return { collections, totalCount, truncated };
}

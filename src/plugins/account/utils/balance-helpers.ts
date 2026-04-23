import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { TokenBalanceInfo } from '@/core/services/mirrornode/types';
import type { SupportedNetwork } from '@/core/types/shared.types';

import BigNumber from 'bignumber.js';

import { MirrorNodeTokenType } from '@/core/services/mirrornode/types';
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
    tokenBalances.tokens.map(async (token: TokenBalanceInfo) => {
      const balanceRaw = BigInt(token.balance.toString());
      const alias = api.alias.resolve(
        token.token_id,
        AliasType.Token,
        network,
      )?.alias;

      let name: string | undefined;
      let symbol: string | undefined;
      let decimals: number | undefined;
      let isNft = false;

      try {
        const tokenInfo = await api.mirror.getTokenInfo(token.token_id);
        name = tokenInfo.name;
        symbol = tokenInfo.symbol;
        decimals = parseInt(tokenInfo.decimals, 10);
        isNft = tokenInfo.type === MirrorNodeTokenType.NON_FUNGIBLE_UNIQUE;
      } catch {
        decimals = token.decimals;
      }

      if (isNft) return null;

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
    }),
  );

  const filtered = results.filter(
    (t) => t !== null,
  ) as TokenBalanceWithMetadata[];
  return filtered.length > 0 ? filtered : undefined;
}

export async function fetchAccountNftBalances(
  api: CoreApi,
  accountId: string,
  tokenId: string | undefined,
  network: SupportedNetwork,
): Promise<NftBalancesResult | undefined> {
  const response = await api.mirror.getAccountNfts(accountId, 100);

  const nfts = tokenId
    ? response.nfts.filter((nft) => nft.token_id === tokenId)
    : response.nfts;

  if (nfts.length === 0) return undefined;

  const serialsByToken = new Map<string, number[]>();
  for (const nft of nfts) {
    const existing = serialsByToken.get(nft.token_id) ?? [];
    serialsByToken.set(nft.token_id, [...existing, nft.serial_number]);
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

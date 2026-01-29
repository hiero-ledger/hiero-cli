/**
 * Balance Helper Functions
 * Utility functions for account balance operations
 */
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { TokenBalanceInfo } from '@/core/services/mirrornode/types';
import type { SupportedNetwork } from '@/core/types/shared.types';

import BigNumber from 'bignumber.js';

import { normalizeBalance } from '@/core/utils/normalize-balance';

/**
 * Token balance with metadata
 */
export interface TokenBalanceWithMetadata {
  tokenId: string;
  name?: string;
  symbol?: string;
  alias?: string;
  balance: bigint;
  balanceDisplay?: string;
  decimals?: number;
}

/**
 * Fetches and maps token balances for an account with token metadata
 * @param api - The Core API instance
 * @param accountId - The account ID to fetch token balances for
 * @param tokenId - Optional specific token ID to filter by
 * @param raw - Whether to return raw units (base units) or display units
 * @param network - Network the tokens are on
 * @returns An array of token balances with metadata or undefined if no tokens found
 * @throws Error if token balances could not be fetched
 */
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

  return Promise.all(
    tokenBalances.tokens.map(async (token: TokenBalanceInfo) => {
      const balanceRaw = BigInt(token.balance.toString());
      const alias = api.alias.resolve(token.token_id, 'token', network)?.alias;

      let name: string | undefined;
      let symbol: string | undefined;
      let decimals: number | undefined;
      try {
        const tokenInfo = await api.mirror.getTokenInfo(token.token_id);
        name = tokenInfo.name;
        symbol = tokenInfo.symbol;
        decimals = parseInt(tokenInfo.decimals, 10);
      } catch {
        decimals = token.decimals;
      }

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
}

/**
 * Balance Helper Functions
 * Utility functions for account balance operations
 */
import BigNumber from 'bignumber.js';
import { TokenBalanceInfo } from '../../../core/services/mirrornode/types';
import { normalizeBalance } from '../../../core/utils/normalize-balance';
import type { CoreApi } from '../../../core/core-api/core-api.interface';
import type { SupportedNetwork } from '../../../core/types/shared.types';
import type { AliasRecord } from '../../../core/services/alias/alias-service.interface';

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
 * Resolves the token alias from the alias service
 * @param api - Core API instance
 * @param tokenId - Token ID to resolve
 * @param network - Network the token is on
 * @returns The alias if found, null otherwise
 */
export function resolveTokenAlias(
  api: CoreApi,
  tokenId: string,
  network: SupportedNetwork,
): string | null {
  try {
    const aliases = api.alias.list({ network, type: 'token' });
    const aliasRecord = aliases.find(
      (alias: AliasRecord) => alias.entityId === tokenId,
    );
    return aliasRecord ? aliasRecord.alias : null;
  } catch (error: unknown) {
    return null;
  }
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
      const alias = resolveTokenAlias(api, token.token_id, network);

      const {
        name,
        symbol,
        decimals: tokenDecimals,
      } = await api.mirror.getTokenInfo(token.token_id).then(
        (tokenInfo) => ({
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          decimals: parseInt(tokenInfo.decimals, 10),
        }),
        () => ({
          name: undefined,
          symbol: undefined,
          decimals: token.decimals,
        }),
      );

      let balanceDisplay: string | undefined;
      if (!raw && tokenDecimals !== undefined) {
        balanceDisplay = normalizeBalance(
          new BigNumber(balanceRaw.toString()),
          tokenDecimals,
        );
      }

      return {
        tokenId: token.token_id,
        name,
        symbol,
        alias: alias ?? undefined,
        balance: balanceRaw,
        balanceDisplay,
        decimals: tokenDecimals,
      };
    }),
  );
}

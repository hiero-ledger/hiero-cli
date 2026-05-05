/**
 * Token State Helper for Zustand State Management
 * Provides convenient methods for token state operations
 */
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';
import type { TokenData } from './schema';

import { TOKEN_NAMESPACE } from './constants';

export class ZustandTokenStateHelper {
  private state: StateService;
  private logger: Logger;

  constructor(state: StateService, logger: Logger) {
    this.state = state;
    this.logger = logger;
  }

  /**
   * Save a token to the state
   */
  saveToken(key: string, tokenData: TokenData): void {
    try {
      this.logger.debug(`[TOKEN STATE] Saving token ${key} to state`);

      // Use the state service to save data in the token namespace
      this.state.set(TOKEN_NAMESPACE, key, tokenData);

      this.logger.debug(`[TOKEN STATE] Successfully saved token ${key}`);
    } catch (error) {
      this.logger.error(
        `[TOKEN STATE] Failed to save token ${key}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get a token from the state
   */
  getToken(key: string): TokenData | null {
    try {
      this.logger.debug(`[TOKEN STATE] Getting token ${key} from state`);

      const tokenData = this.state.get<TokenData>(TOKEN_NAMESPACE, key);

      if (tokenData) {
        this.logger.debug(`[TOKEN STATE] Found token ${key} in state`);
        return tokenData;
      } else {
        this.logger.debug(`[TOKEN STATE] Token ${key} not found in state`);
        return null;
      }
    } catch (error) {
      this.logger.error(
        `[TOKEN STATE] Failed to get token ${key}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get all tokens from the state
   */
  getAllTokens(): Record<string, TokenData> {
    try {
      this.logger.debug(`[TOKEN STATE] Getting all tokens from state`);

      const allTokens = this.state.list<TokenData>(TOKEN_NAMESPACE);
      const tokensMap: Record<string, TokenData> = {};

      // Convert array to record using token IDs as keys
      allTokens.forEach((token) => {
        if (token && token.tokenId) {
          tokensMap[token.tokenId] = token;
        }
      });

      this.logger.debug(
        `[TOKEN STATE] Found ${Object.keys(tokensMap).length} tokens in state`,
      );
      return tokensMap;
    } catch (error) {
      this.logger.error(
        `[TOKEN STATE] Failed to get all tokens: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Remove a token from the state
   */
  removeToken(key: string): void {
    try {
      this.logger.debug(`[TOKEN STATE] Removing token ${key} from state`);

      this.state.delete(TOKEN_NAMESPACE, key);

      this.logger.debug(`[TOKEN STATE] Successfully removed token ${key}`);
    } catch (error) {
      this.logger.error(
        `[TOKEN STATE] Failed to remove token ${key}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * List all tokens with validation
   */
  listTokens(): TokenData[] {
    try {
      this.logger.debug(`[TOKEN STATE] Listing all tokens`);

      const allTokens = this.state.list<TokenData>(TOKEN_NAMESPACE);
      this.logger.debug(
        `[TOKEN STATE] Retrieved ${allTokens.length} tokens from state`,
      );

      // Log each token for debugging
      allTokens.forEach((token, index) => {
        if (token && token.tokenId) {
          this.logger.debug(
            `[TOKEN STATE]   ${index + 1}. ${token.name} (${token.symbol}) - ${token.tokenId} on ${token.network}`,
          );
        } else {
          this.logger.debug(
            `[TOKEN STATE]   ${index + 1}. Invalid token data: ${JSON.stringify(token)}`,
          );
        }
      });

      // Filter and return only valid tokens
      const validTokens = allTokens.filter((tokenData) => {
        if (!tokenData || !tokenData.tokenId) {
          this.logger.warn(
            `[TOKEN STATE] Skipping invalid token data (missing tokenId)`,
          );
          return false;
        }
        return true;
      });

      this.logger.debug(
        `[TOKEN STATE] Returning ${validTokens.length} valid tokens`,
      );
      return validTokens;
    } catch (error) {
      this.logger.error(
        `[TOKEN STATE] Failed to list tokens: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get token statistics
   */
  getTokensWithStats(): {
    total: number;
    byNetwork: Record<string, number>;
    bySupplyType: Record<string, number>;
    withAssociations: number;
    totalAssociations: number;
    withKeys: number;
  } {
    try {
      this.logger.debug(`[TOKEN STATE] Generating token statistics`);

      const tokens = this.listTokens();

      const stats = {
        total: tokens.length,
        byNetwork: {} as Record<string, number>,
        bySupplyType: {} as Record<string, number>,
        withAssociations: 0,
        totalAssociations: 0,
        withKeys: 0,
      };

      for (const token of tokens) {
        // Count by network
        stats.byNetwork[token.network] =
          (stats.byNetwork[token.network] || 0) + 1;

        // Count by supply type
        stats.bySupplyType[token.supplyType] =
          (stats.bySupplyType[token.supplyType] || 0) + 1;

        // Count tokens with admin key
        if (token.adminKeyRefIds.length > 0) {
          stats.withKeys++;
        }
      }

      this.logger.debug(
        `[TOKEN STATE] Generated stats for ${stats.total} tokens`,
      );
      return stats;
    } catch (error) {
      this.logger.error(
        `[TOKEN STATE] Failed to generate token stats: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}

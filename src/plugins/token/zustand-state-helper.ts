/**
 * Token State Helper for Zustand State Management
 * Provides convenient methods for token state operations
 */
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';

import { toErrorMessage } from '@/core/utils/errors';

import { TOKEN_NAMESPACE } from './manifest';
import { type TokenData } from './schema';

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
  saveToken(tokenId: string, tokenData: TokenData): void {
    try {
      this.logger.debug(`[TOKEN STATE] Saving token ${tokenId} to state`);

      // Use the state service to save data in the token namespace
      this.state.set(TOKEN_NAMESPACE, tokenId, tokenData);

      this.logger.debug(`[TOKEN STATE] Successfully saved token ${tokenId}`);
    } catch (error) {
      this.logger.error(
        `[TOKEN STATE] Failed to save token ${tokenId}: ${toErrorMessage(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get a token from the state
   */
  getToken(tokenId: string): TokenData | null {
    try {
      this.logger.debug(`[TOKEN STATE] Getting token ${tokenId} from state`);

      const tokenData = this.state.get<TokenData>(TOKEN_NAMESPACE, tokenId);

      if (tokenData) {
        this.logger.debug(`[TOKEN STATE] Found token ${tokenId} in state`);
        return tokenData;
      } else {
        this.logger.debug(`[TOKEN STATE] Token ${tokenId} not found in state`);
        return null;
      }
    } catch (error) {
      this.logger.error(
        `[TOKEN STATE] Failed to get token ${tokenId}: ${toErrorMessage(error)}`,
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
        `[TOKEN STATE] Failed to get all tokens: ${toErrorMessage(error)}`,
      );
      throw error;
    }
  }

  /**
   * Remove a token from the state
   */
  removeToken(tokenId: string): void {
    try {
      this.logger.debug(`[TOKEN STATE] Removing token ${tokenId} from state`);

      this.state.delete(TOKEN_NAMESPACE, tokenId);

      this.logger.debug(`[TOKEN STATE] Successfully removed token ${tokenId}`);
    } catch (error) {
      this.logger.error(
        `[TOKEN STATE] Failed to remove token ${tokenId}: ${toErrorMessage(error)}`,
      );
      throw error;
    }
  }

  /**
   * Add an association to a token
   */
  addTokenAssociation(
    tokenId: string,
    accountId: string,
    accountName: string,
  ): void {
    try {
      const tokenData = this.getToken(tokenId);
      if (!tokenData) {
        throw new Error(`Token ${tokenId} not found`);
      }

      // Check if association already exists
      // Create a copy of the associations array to avoid immutability issues
      const associations = Array.isArray(tokenData.associations)
        ? [...tokenData.associations]
        : [];
      const existingAssociation = associations.find(
        (assoc) => assoc.accountId === accountId,
      );

      if (!existingAssociation) {
        // Create a completely new token object to avoid immutability issues
        // Create new associations array from scratch to avoid frozen array issues
        const newAssociations = [];
        for (const assoc of associations) {
          newAssociations.push({ ...assoc });
        }
        newAssociations.push({
          name: accountName,
          accountId: accountId,
        });

        const updatedTokenData: TokenData = {
          tokenId: tokenData.tokenId,
          name: tokenData.name,
          symbol: tokenData.symbol,
          treasuryId: tokenData.treasuryId,
          decimals: tokenData.decimals,
          initialSupply: tokenData.initialSupply,
          tokenType: tokenData.tokenType,
          supplyType: tokenData.supplyType,
          maxSupply: tokenData.maxSupply,
          network: tokenData.network,
          associations: newAssociations,
          customFees: Array.isArray(tokenData.customFees)
            ? [...tokenData.customFees]
            : [],
          memo: tokenData.memo,
          adminPublicKey: tokenData.adminPublicKey,
          supplyPublicKey: tokenData.supplyPublicKey,
        };

        this.saveToken(tokenId, updatedTokenData);
        this.logger.debug(
          `[TOKEN STATE] Added association ${accountId} to token ${tokenId}`,
        );
      } else {
        this.logger.debug(
          `[TOKEN STATE] Association ${accountId} already exists for token ${tokenId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[TOKEN STATE] Failed to add association to token ${tokenId}: ${toErrorMessage(error)}`,
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
        `[TOKEN STATE] Failed to list tokens: ${toErrorMessage(error)}`,
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

        // Count associations
        const associationCount = token.associations?.length || 0;
        if (associationCount > 0) {
          stats.withAssociations++;
          stats.totalAssociations += associationCount;
        }

        // Count tokens with admin key
        if (token.adminPublicKey) {
          stats.withKeys++;
        }
      }

      this.logger.debug(
        `[TOKEN STATE] Generated stats for ${stats.total} tokens`,
      );
      return stats;
    } catch (error) {
      this.logger.error(
        `[TOKEN STATE] Failed to generate token stats: ${toErrorMessage(error)}`,
      );
      throw error;
    }
  }
}

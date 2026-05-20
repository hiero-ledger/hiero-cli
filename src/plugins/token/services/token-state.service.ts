import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';
import type { TokenData } from '@/plugins/token/schema';
import type {
  TokenStateService,
  TokenStateStats,
} from '@/plugins/token/services/token-state.service.interface';

import { NotFoundError, ValidationError } from '@/core/errors';
import { TOKEN_NAMESPACE } from '@/plugins/token/constants';
import { TokenDataSchema } from '@/plugins/token/schema';

export class TokenStateServiceImpl implements TokenStateService {
  constructor(
    private readonly state: StateService,
    private readonly logger: Logger,
  ) {}

  saveToken(key: string, tokenData: TokenData): void {
    try {
      const parsed = TokenDataSchema.safeParse(tokenData);
      if (!parsed.success) {
        throw ValidationError.fromZod(parsed.error);
      }

      this.logger.debug(`[TOKEN STATE] Saving token ${key} to state`);
      this.state.set(TOKEN_NAMESPACE, key, parsed.data);
      this.logger.debug(`[TOKEN STATE] Successfully saved token ${key}`);
    } catch (error) {
      this.logger.error(
        `[TOKEN STATE] Failed to save token ${key}: ${this.getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  getToken(key: string): TokenData | null {
    try {
      this.logger.debug(`[TOKEN STATE] Getting token ${key} from state`);
      const tokenData = this.state.get<unknown>(TOKEN_NAMESPACE, key);
      if (!tokenData) {
        this.logger.debug(`[TOKEN STATE] Token ${key} not found in state`);
        return null;
      }

      const parsed = TokenDataSchema.safeParse(tokenData);
      if (!parsed.success) {
        this.logger.warn(
          `[TOKEN STATE] Skipping invalid token data for ${key}`,
        );
        return null;
      }

      this.logger.debug(`[TOKEN STATE] Found token ${key} in state`);
      return parsed.data;
    } catch (error) {
      this.logger.error(
        `[TOKEN STATE] Failed to get token ${key}: ${this.getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  getAllTokens(): Record<string, TokenData> {
    try {
      this.logger.debug('[TOKEN STATE] Getting all tokens from state');
      const tokensMap: Record<string, TokenData> = {};
      for (const token of this.listTokens()) {
        tokensMap[token.tokenId] = token;
      }
      this.logger.debug(
        `[TOKEN STATE] Found ${Object.keys(tokensMap).length} tokens in state`,
      );
      return tokensMap;
    } catch (error) {
      this.logger.error(
        `[TOKEN STATE] Failed to get all tokens: ${this.getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  removeToken(key: string): void {
    try {
      this.logger.debug(`[TOKEN STATE] Removing token ${key} from state`);
      this.state.delete(TOKEN_NAMESPACE, key);
      this.logger.debug(`[TOKEN STATE] Successfully removed token ${key}`);
    } catch (error) {
      this.logger.error(
        `[TOKEN STATE] Failed to remove token ${key}: ${this.getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  addTokenAssociation(
    key: string,
    accountId: string,
    accountName: string,
  ): void {
    try {
      const tokenData = this.getToken(key);
      if (!tokenData) {
        throw new NotFoundError(`Token ${key} not found`, {
          context: { key },
        });
      }

      const associations = [...tokenData.associations];
      const existingAssociation = associations.find(
        (assoc) => assoc.accountId === accountId,
      );
      if (existingAssociation) {
        this.logger.debug(
          `[TOKEN STATE] Association ${accountId} already exists for token ${key}`,
        );
        return;
      }

      this.saveToken(key, {
        ...tokenData,
        associations: [
          ...associations.map((assoc) => ({ ...assoc })),
          { name: accountName, accountId },
        ],
        customFees: [...tokenData.customFees],
      });
      this.logger.debug(
        `[TOKEN STATE] Added association ${accountId} to token ${key}`,
      );
    } catch (error) {
      this.logger.error(
        `[TOKEN STATE] Failed to add association to token ${key}: ${this.getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  removeTokenAssociation(key: string, accountId: string): void {
    const tokenData = this.getToken(key);
    if (!tokenData) {
      this.logger.debug(
        `[TOKEN STATE] Token ${key} not found; skip remove association`,
      );
      return;
    }

    const filtered = tokenData.associations.filter(
      (assoc) => assoc.accountId !== accountId,
    );
    if (filtered.length === tokenData.associations.length) {
      this.logger.debug(`[TOKEN STATE] No association ${accountId} on ${key}`);
      return;
    }

    this.saveToken(key, {
      ...tokenData,
      associations: filtered,
      customFees: [...tokenData.customFees],
    });
    this.logger.debug(
      `[TOKEN STATE] Removed association ${accountId} from token ${key}`,
    );
  }

  listTokens(): TokenData[] {
    this.logger.debug('[TOKEN STATE] Listing all tokens');
    const allTokens = this.state.list<unknown>(TOKEN_NAMESPACE);
    const validTokens: TokenData[] = [];

    for (const tokenData of allTokens) {
      const parsed = TokenDataSchema.safeParse(tokenData);
      if (!parsed.success) {
        this.logger.warn('[TOKEN STATE] Skipping invalid token data');
        continue;
      }
      validTokens.push(parsed.data);
    }

    this.logger.debug(
      `[TOKEN STATE] Returning ${validTokens.length} valid tokens`,
    );
    return validTokens;
  }

  getTokensWithStats(): TokenStateStats {
    const tokens = this.listTokens();
    const stats: TokenStateStats = {
      total: tokens.length,
      byNetwork: {},
      bySupplyType: {},
      withAssociations: 0,
      totalAssociations: 0,
      withKeys: 0,
    };

    for (const token of tokens) {
      stats.byNetwork[token.network] =
        (stats.byNetwork[token.network] ?? 0) + 1;
      stats.bySupplyType[token.supplyType] =
        (stats.bySupplyType[token.supplyType] ?? 0) + 1;

      const associationCount = token.associations.length;
      if (associationCount > 0) {
        stats.withAssociations++;
        stats.totalAssociations += associationCount;
      }

      if (token.adminKeyRefIds.length > 0) {
        stats.withKeys++;
      }
    }

    return stats;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

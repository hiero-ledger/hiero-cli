import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { Credential } from '@/core/services/kms/kms-types.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { ReceiptService } from '@/core/services/receipt/receipt-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';
import type {
  BatchDataItem,
  TransactionResult,
} from '@/core/types/shared.types';
import type { TokenData } from '@/plugins/token/schema';
import type { TokenAssociationsService } from '@/plugins/token/services/token-associations.service.interface';
import type {
  TokenStateService,
  TokenStateStats,
} from '@/plugins/token/services/token-state.service.interface';

import { InternalError, NotFoundError, ValidationError } from '@/core/errors';
import { AliasType } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { ValidationError } from '@/core/errors';
import { TOKEN_NAMESPACE } from '@/plugins/token/constants';
import { AssociateNormalizedParamsSchema } from '@/plugins/token/hooks/token-associate-state/types';
import { CreateFtFromFileNormalizedParamsSchema } from '@/plugins/token/hooks/token-create-ft-from-file-state/types';
import { CreateFtNormalizedParamsSchema } from '@/plugins/token/hooks/token-create-ft-state/types';
import { CreateNftFromFileNormalizedParamsSchema } from '@/plugins/token/hooks/token-create-nft-from-file-state/types';
import { CreateNftNormalizedParamsSchema } from '@/plugins/token/hooks/token-create-nft-state/types';
import { DeleteNormalizedParamsSchema } from '@/plugins/token/hooks/token-delete-state/types';
import { DissociateNormalizedParamsSchema } from '@/plugins/token/hooks/token-dissociate-state/types';
import { TokenUpdateNormalisedParamsSchema } from '@/plugins/token/hooks/token-update-state/types';
import { TokenDataSchema } from '@/plugins/token/schema';
import {
  buildNftTokenDataFromFile,
  buildTokenData,
  buildTokenDataFromFile,
  buildUpdatedTokenData,
} from '@/plugins/token/utils/token-data-builders';

export class TokenStateServiceImpl implements TokenStateService {
  constructor(
    private readonly state: StateService,
    private readonly logger: Logger,
    private readonly receipt: ReceiptService,
    private readonly alias: AliasService,
    private readonly tokenAssociations?: TokenAssociationsService,
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
      withKeys: 0,
    };

    for (const token of tokens) {
      stats.byNetwork[token.network] =
        (stats.byNetwork[token.network] ?? 0) + 1;
      stats.bySupplyType[token.supplyType] =
        (stats.bySupplyType[token.supplyType] ?? 0) + 1;

      if (token.adminKeyRefIds.length > 0) {
        stats.withKeys++;
      }
    }

    return stats;
  }

  applyAssociationFromBatchItem(item: BatchDataItem): Promise<void> {
    const parsed = AssociateNormalizedParamsSchema.safeParse(
      item.normalizedParams,
    );
    if (!parsed.success) {
      this.logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return Promise.resolve();
    }
    const params = parsed.data;
    if (params.alreadyAssociated) {
      this.logger.debug(
        `Skipping already associated token ${params.tokenId} for account ${params.account.accountId}`,
      );
      return Promise.resolve();
    }
    const tokenKey = composeKey(params.network, params.tokenId);
    if (!this.getToken(tokenKey)) return Promise.resolve();
    this.addTokenAssociation(
      tokenKey,
      params.account.accountId,
      params.account.accountId,
    );
    this.logger.info('   Association saved to token state');
    return Promise.resolve();
  }

  applyDissociationFromBatchItem(item: BatchDataItem): Promise<void> {
    const parsed = DissociateNormalizedParamsSchema.safeParse(
      item.normalizedParams,
    );
    if (!parsed.success) {
      this.logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return Promise.resolve();
    }
    const params = parsed.data;
    const tokenKey = composeKey(params.network, params.tokenId);
    if (!this.getToken(tokenKey)) return Promise.resolve();
    this.removeTokenAssociation(tokenKey, params.account.accountId);
    this.logger.info('   Association removed from token state');
    return Promise.resolve();
  }

  async applyCreateFtFromBatchItem(item: BatchDataItem): Promise<void> {
    const parsed = CreateFtNormalizedParamsSchema.safeParse(
      item.normalizedParams,
    );
    if (!parsed.success) {
      this.logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }
    const params = parsed.data;
    const receipt = await this.fetchReceiptOrWarn(item);
    if (!receipt || !receipt.tokenId) return;

    const tokenData = buildTokenData(receipt, {
      name: params.name,
      symbol: params.symbol,
      treasuryId: params.treasury.accountId,
      decimals: params.decimals,
      initialSupply: params.initialSupply,
      tokenType: params.tokenType,
      supplyType: params.supplyType,
      adminKeyRefIds: params.adminKeys.map((k) => k.keyRefId),
      adminKeyThreshold: params.adminKeyThreshold,
      supplyKeyRefIds: params.supplyKeys.map((k) => k.keyRefId),
      supplyKeyThreshold: params.supplyKeyThreshold,
      freezeKeyRefIds: params.freezeKeys.map((k) => k.keyRefId),
      freezeKeyThreshold: params.freezeKeyThreshold,
      wipeKeyRefIds: params.wipeKeys.map((k) => k.keyRefId),
      wipeKeyThreshold: params.wipeKeyThreshold,
      kycKeyRefIds: params.kycKeys.map((k) => k.keyRefId),
      kycKeyThreshold: params.kycKeyThreshold,
      pauseKeyRefIds: params.pauseKeys.map((k) => k.keyRefId),
      pauseKeyThreshold: params.pauseKeyThreshold,
      feeScheduleKeyRefIds: params.feeScheduleKeys.map((k) => k.keyRefId),
      feeScheduleKeyThreshold: params.feeScheduleKeyThreshold,
      metadataKeyRefIds: params.metadataKeys.map((k) => k.keyRefId),
      metadataKeyThreshold: params.metadataKeyThreshold,
      network: params.network,
    });

    const key = composeKey(params.network, receipt.tokenId);
    this.saveToken(key, tokenData);
    this.logger.info('   Token data saved to state');
    this.registerTokenAlias(params.alias, params.network, receipt);
  }

  async applyCreateNftFromBatchItem(item: BatchDataItem): Promise<void> {
    const parsed = CreateNftNormalizedParamsSchema.safeParse(
      item.normalizedParams,
    );
    if (!parsed.success) {
      this.logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }
    const params = parsed.data;
    const receipt = await this.fetchReceiptOrWarn(item);
    if (!receipt || !receipt.tokenId) return;

    const tokenData = buildTokenData(receipt, {
      name: params.name,
      symbol: params.symbol,
      treasuryId: params.treasury.accountId,
      decimals: params.decimals,
      initialSupply: params.initialSupply,
      tokenType: params.tokenType,
      supplyType: params.supplyType,
      adminKeyRefIds: params.adminKeys.map((k) => k.keyRefId),
      adminKeyThreshold: params.adminKeyThreshold,
      supplyKeyRefIds: params.supplyKeys.map((k) => k.keyRefId),
      supplyKeyThreshold: params.supplyKeyThreshold,
      freezeKeyRefIds: params.freezeKeys.map((k) => k.keyRefId),
      freezeKeyThreshold: params.freezeKeyThreshold,
      wipeKeyRefIds: params.wipeKeys.map((k) => k.keyRefId),
      wipeKeyThreshold: params.wipeKeyThreshold,
      kycKeyRefIds: params.kycKeys.map((k) => k.keyRefId),
      kycKeyThreshold: params.kycKeyThreshold,
      pauseKeyRefIds: params.pauseKeys.map((k) => k.keyRefId),
      pauseKeyThreshold: params.pauseKeyThreshold,
      feeScheduleKeyRefIds: params.feeScheduleKeys.map((k) => k.keyRefId),
      feeScheduleKeyThreshold: params.feeScheduleKeyThreshold,
      metadataKeyRefIds: params.metadataKeys.map((k) => k.keyRefId),
      metadataKeyThreshold: params.metadataKeyThreshold,
      network: params.network,
    });

    const key = composeKey(params.network, receipt.tokenId);
    this.saveToken(key, tokenData);
    this.logger.info('   Non-fungible token data saved to state');
    this.registerTokenAlias(params.alias, params.network, receipt);
  }

  applyUpdateFromBatchItem(item: BatchDataItem): Promise<void> {
    const parsed = TokenUpdateNormalisedParamsSchema.safeParse(
      item.normalizedParams,
    );
    if (!parsed.success) {
      this.logger.warn(
        'There was a problem with parsing data schema. The saving will not be done',
      );
      return Promise.resolve();
    }
    const params = parsed.data;
    const existing = this.getToken(params.stateKey);
    const tokenData = buildUpdatedTokenData(params, params.tokenInfo, existing);
    this.saveToken(params.stateKey, tokenData);
    this.logger.info(`   Token update state saved for ${params.tokenId}`);
    return Promise.resolve();
  }

  applyDeleteFromBatchItem(item: BatchDataItem): Promise<void> {
    const parsed = DeleteNormalizedParamsSchema.safeParse(
      item.normalizedParams,
    );
    if (!parsed.success) {
      this.logger.warn(
        'Problem parsing delete batch data. State cleanup skipped.',
      );
      return Promise.resolve();
    }
    const { network, tokenId } = parsed.data;
    const key = composeKey(network, tokenId);
    if (!this.getToken(key)) return Promise.resolve();

    const aliases = this.alias
      .list({ network, type: AliasType.Token })
      .filter((rec) => rec.entityId === tokenId);
    for (const rec of aliases) {
      this.alias.remove(rec.alias, network);
    }

    this.removeToken(key);
    this.logger.debug(`Cleaned up state for deleted token ${tokenId}`);
    return Promise.resolve();
  }

  async applyCreateFtFromFileFromBatchItem(item: BatchDataItem): Promise<void> {
    if (!this.tokenAssociations) {
      throw new InternalError(
        'TokenAssociationsService not provided to TokenStateService',
      );
    }
    const parsed = CreateFtFromFileNormalizedParamsSchema.safeParse(
      item.normalizedParams,
    );
    if (!parsed.success) {
      this.logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }
    const params = parsed.data;
    const receipt = await this.fetchReceiptOrWarn(item);
    if (!receipt || !receipt.tokenId) return;

    const tokenData = buildTokenDataFromFile(receipt, params);
    tokenData.associations =
      await this.tokenAssociations.processTokenAssociations(
        receipt.tokenId,
        params.associations as Credential[],
        params.keyManager,
      );

    const key = composeKey(params.network, receipt.tokenId);
    this.saveToken(key, tokenData);
    this.logger.info('   Token data saved to state');
    this.registerTokenAlias(params.alias, params.network, receipt);
  }

  async applyCreateNftFromFileFromBatchItem(
    item: BatchDataItem,
  ): Promise<void> {
    if (!this.tokenAssociations) {
      throw new InternalError(
        'TokenAssociationsService not provided to TokenStateService',
      );
    }
    const parsed = CreateNftFromFileNormalizedParamsSchema.safeParse(
      item.normalizedParams,
    );
    if (!parsed.success) {
      this.logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }
    const params = parsed.data;
    const receipt = await this.fetchReceiptOrWarn(item);
    if (!receipt || !receipt.tokenId) return;

    const tokenData = buildNftTokenDataFromFile(receipt, params);
    tokenData.associations =
      await this.tokenAssociations.processTokenAssociations(
        receipt.tokenId,
        params.associations as Credential[],
        params.keyManager,
      );

    const key = composeKey(params.network, receipt.tokenId);
    this.saveToken(key, tokenData);
    this.logger.info('   Non-fungible token data saved to state');
    this.registerTokenAlias(params.alias, params.network, receipt);
  }

  private async fetchReceiptOrWarn(
    item: BatchDataItem,
  ): Promise<TransactionResult | null> {
    const transactionId = item.transactionId;
    if (!transactionId) {
      this.logger.warn(
        `No transaction ID found for batch transaction ${item.order}`,
      );
      return null;
    }
    const receipt = await this.receipt.getReceipt({ transactionId });
    if (!receipt.tokenId) {
      this.logger.warn(
        'Transaction completed but did not return a token ID, skipping state save',
      );
      return null;
    }
    return receipt;
  }

  private registerTokenAlias(
    aliasName: string | undefined,
    network: TokenData['network'],
    receipt: TransactionResult,
  ): void {
    if (!aliasName || !receipt.tokenId) return;
    if (this.alias.exists(aliasName, network)) {
      this.logger.warn(
        `Alias "${aliasName}" already exists, skipping registration`,
      );
      return;
    }
    this.alias.register({
      alias: aliasName,
      type: AliasType.Token,
      network,
      entityId: receipt.tokenId,
      createdAt: receipt.consensusTimestamp,
    });
    this.logger.info(`   Name registered: ${aliasName}`);
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

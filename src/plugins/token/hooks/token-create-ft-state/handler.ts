import type { CoreApi } from '@/core';
import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';
import type { TokenAliasService } from '@/plugins/token/services/token-alias.service.interface';
import type { TokenStateService } from '@/plugins/token/services/token-state.service.interface';

import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import {
  type BatchDataItem,
  OrchestratorSource,
  type TransactionResult,
} from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { TOKEN_CREATE_FT_COMMAND_NAME } from '@/plugins/token/commands/create-ft';
import { TokenAliasServiceImpl } from '@/plugins/token/services/token-alias.service';
import { TokenStateServiceImpl } from '@/plugins/token/services/token-state.service';
import { buildTokenData } from '@/plugins/token/utils/token-data-builders';

import { CreateFtNormalizedParamsSchema } from './types';

export class TokenCreateFtStateHook implements Hook<PostOutputPreparationHookParams> {
  constructor(
    private readonly tokenStateService: TokenStateService,
    private readonly tokenAliasService: TokenAliasService,
  ) {}

  async execute(params: PostOutputPreparationHookParams): Promise<HookResult> {
    const parsed = OrchestratorResultSchema.safeParse(
      params.executeTransactionResult,
    );
    if (!parsed.success || parsed.data.source !== OrchestratorSource.BATCH) {
      return { breakFlow: false };
    }
    const batchData = parsed.data.batchData;
    if (!batchData.success) {
      return { breakFlow: false };
    }
    const { api } = params.args;
    await Promise.all(
      [...batchData.transactions]
        .filter((item) => item.command === TOKEN_CREATE_FT_COMMAND_NAME)
        .map((batchDataItem) => this.saveCreateFt(api, batchDataItem)),
    );
    return { breakFlow: false };
  }

  private async saveCreateFt(
    api: CoreApi,
    batchDataItem: BatchDataItem,
  ): Promise<void> {
    const parseResult = CreateFtNormalizedParamsSchema.safeParse(
      batchDataItem.normalizedParams,
    );
    if (!parseResult.success) {
      api.logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }
    const normalisedParams = parseResult.data;
    const innerTransactionId = batchDataItem.transactionId;
    if (!innerTransactionId) {
      api.logger.warn(
        `No transaction ID found for batch transaction ${batchDataItem.order}`,
      );
      return;
    }

    const innerTransactionResult: TransactionResult =
      await api.receipt.getReceipt({
        transactionId: innerTransactionId,
      });

    if (!innerTransactionResult.tokenId) {
      api.logger.warn(
        'Transaction completed but did not return a token ID, skipping state save',
      );
      return;
    }

    const tokenData = buildTokenData(innerTransactionResult, {
      name: normalisedParams.name,
      symbol: normalisedParams.symbol,
      treasuryId: normalisedParams.treasury.accountId,
      decimals: normalisedParams.decimals,
      initialSupply: normalisedParams.initialSupply,
      tokenType: normalisedParams.tokenType,
      supplyType: normalisedParams.supplyType,
      adminKeyRefIds: normalisedParams.adminKeys.map((k) => k.keyRefId),
      adminKeyThreshold: normalisedParams.adminKeyThreshold,
      supplyKeyRefIds: normalisedParams.supplyKeys.map((k) => k.keyRefId),
      supplyKeyThreshold: normalisedParams.supplyKeyThreshold,
      freezeKeyRefIds: normalisedParams.freezeKeys.map((k) => k.keyRefId),
      freezeKeyThreshold: normalisedParams.freezeKeyThreshold,
      wipeKeyRefIds: normalisedParams.wipeKeys.map((k) => k.keyRefId),
      wipeKeyThreshold: normalisedParams.wipeKeyThreshold,
      kycKeyRefIds: normalisedParams.kycKeys.map((k) => k.keyRefId),
      kycKeyThreshold: normalisedParams.kycKeyThreshold,
      pauseKeyRefIds: normalisedParams.pauseKeys.map((k) => k.keyRefId),
      pauseKeyThreshold: normalisedParams.pauseKeyThreshold,
      feeScheduleKeyRefIds: normalisedParams.feeScheduleKeys.map(
        (k) => k.keyRefId,
      ),
      feeScheduleKeyThreshold: normalisedParams.feeScheduleKeyThreshold,
      metadataKeyRefIds: normalisedParams.metadataKeys.map((k) => k.keyRefId),
      metadataKeyThreshold: normalisedParams.metadataKeyThreshold,
      network: normalisedParams.network,
    });

    const key = composeKey(
      normalisedParams.network,
      innerTransactionResult.tokenId,
    );
    this.tokenStateService.saveToken(key, tokenData);
    api.logger.info('   Token data saved to state');

    if (normalisedParams.alias) {
      if (
        this.tokenAliasService.exists(
          normalisedParams.alias,
          normalisedParams.network,
        )
      ) {
        api.logger.warn(
          `Alias "${normalisedParams.alias}" already exists, skipping registration`,
        );
      } else {
        this.tokenAliasService.register({
          alias: normalisedParams.alias,
          network: normalisedParams.network,
          tokenId: innerTransactionResult.tokenId,
          createdAt: innerTransactionResult.consensusTimestamp,
        });
        api.logger.info(`   Name registered: ${normalisedParams.alias}`);
      }
    }
  }
}

export const tokenCreateFtStateHook: Hook<PostOutputPreparationHookParams> = {
  execute: (params: PostOutputPreparationHookParams) => {
    const { api } = params.args;
    return new TokenCreateFtStateHook(
      new TokenStateServiceImpl(api.state, api.logger),
      new TokenAliasServiceImpl(api.alias),
    ).execute(params);
  },
};

import type { CoreApi, Logger } from '@/core';
import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';

import { StateError } from '@/core';
import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import {
  type BatchDataItem,
  OrchestratorSource,
  type TransactionResult,
} from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { TOKEN_CREATE_FT_COMMAND_NAME } from '@/plugins/token/commands/create-ft';
import { buildTokenData } from '@/plugins/token/utils/token-data-builders';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { CreateFtNormalizedParamsSchema } from './types';

export class TokenCreateFtStateHook implements Hook<PostOutputPreparationHookParams> {
  async execute(params: PostOutputPreparationHookParams): Promise<HookResult> {
    const parsed = OrchestratorResultSchema.safeParse(
      params.executeTransactionResult,
    );
    if (!parsed.success || parsed.data.source !== OrchestratorSource.BATCH) {
      return { breakFlow: false };
    }
    const batchData = parsed.data.batchData;
    const { api, logger } = params.args;
    await Promise.all(
      [...batchData.transactions]
        .filter((item) => item.command === TOKEN_CREATE_FT_COMMAND_NAME)
        .map((batchDataItem) => this.saveCreateFt(api, logger, batchDataItem)),
    );
    return { breakFlow: false };
  }

  private async saveCreateFt(
    api: CoreApi,
    logger: Logger,
    batchDataItem: BatchDataItem,
  ): Promise<void> {
    const parseResult = CreateFtNormalizedParamsSchema.safeParse(
      batchDataItem.normalizedParams,
    );
    if (!parseResult.success) {
      logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }
    const normalisedParams = parseResult.data;
    const innerTransactionId = batchDataItem.transactionId;
    if (!innerTransactionId) {
      logger.warn(
        `No transaction ID found for batch transaction ${batchDataItem.order}`,
      );
      return;
    }

    const innerTransactionResult: TransactionResult =
      await api.receipt.getReceipt({
        transactionId: innerTransactionId,
      });

    if (!innerTransactionResult.tokenId) {
      throw new StateError(
        'Transaction completed but did not return a token ID',
        { context: { transactionId: innerTransactionResult.transactionId } },
      );
    }

    const tokenData = buildTokenData(innerTransactionResult, {
      name: normalisedParams.name,
      symbol: normalisedParams.symbol,
      treasuryId: normalisedParams.treasury.accountId,
      decimals: normalisedParams.decimals,
      initialSupply: normalisedParams.initialSupply,
      tokenType: normalisedParams.tokenType,
      supplyType: normalisedParams.supplyType,
      adminPublicKey: normalisedParams.admin?.publicKey,
      supplyPublicKey: normalisedParams.supply?.publicKey,
      freezePublicKey: normalisedParams.freeze?.publicKey,
      wipePublicKey: normalisedParams.wipe?.publicKey,
      kycPublicKey: normalisedParams.kyc?.publicKey,
      pausePublicKey: normalisedParams.pause?.publicKey,
      feeSchedulePublicKey: normalisedParams.feeSchedule?.publicKey,
      metadataPublicKey: normalisedParams.metadata?.publicKey,
      network: normalisedParams.network,
    });

    const key = composeKey(
      normalisedParams.network,
      innerTransactionResult.tokenId,
    );
    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    tokenState.saveToken(key, tokenData);
    logger.info('   Token data saved to state');

    if (normalisedParams.alias) {
      if (api.alias.exists(normalisedParams.alias, normalisedParams.network)) {
        logger.warn(
          `Alias "${normalisedParams.alias}" already exists, skipping registration`,
        );
      } else {
        api.alias.register({
          alias: normalisedParams.alias,
          type: AliasType.Token,
          network: normalisedParams.network,
          entityId: innerTransactionResult.tokenId,
          createdAt: innerTransactionResult.consensusTimestamp,
        });
        logger.info(`   Name registered: ${normalisedParams.alias}`);
      }
    }
  }
}

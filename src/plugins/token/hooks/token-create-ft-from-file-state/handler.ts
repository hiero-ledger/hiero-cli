import type { CoreApi, Logger } from '@/core';
import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';

import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import { AliasType } from '@/core/types/shared.types';
import {
  type BatchDataItem,
  OrchestratorSource,
  type TransactionResult,
} from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { TOKEN_CREATE_FT_FROM_FILE_COMMAND_NAME } from '@/plugins/token/commands/create-ft-from-file';
import { processTokenAssociations } from '@/plugins/token/utils/token-associations';
import { buildTokenDataFromFile } from '@/plugins/token/utils/token-data-builders';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { CreateFtFromFileNormalizedParamsSchema } from './types';

export class TokenCreateFtFromFileStateHook implements Hook<PostOutputPreparationHookParams> {
  async execute(params: PostOutputPreparationHookParams): Promise<HookResult> {
    const parsed = OrchestratorResultSchema.safeParse(
      params.executeTransactionResult,
    );
    if (!parsed.success || parsed.data.source !== OrchestratorSource.BATCH) {
      return { breakFlow: false };
    }
    const batchData = parsed.data.batchData;
    const { api, logger } = params.args;
    if (!batchData.success) {
      return { breakFlow: false };
    }
    for (const batchDataItem of [...batchData.transactions].filter(
      (item) => item.command === TOKEN_CREATE_FT_FROM_FILE_COMMAND_NAME,
    )) {
      await this.saveToken(api, logger, batchDataItem);
    }
    return { breakFlow: false };
  }

  private async saveToken(
    api: CoreApi,
    logger: Logger,
    batchDataItem: BatchDataItem,
  ): Promise<void> {
    const parseResult = CreateFtFromFileNormalizedParamsSchema.safeParse(
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
      logger.warn(
        'Transaction completed but did not return a token ID, skipping state save',
      );
      return;
    }

    const tokenData = buildTokenDataFromFile(
      innerTransactionResult,
      normalisedParams,
    );

    tokenData.associations = await processTokenAssociations(
      innerTransactionResult.tokenId,
      normalisedParams.associations,
      api,
      logger,
      normalisedParams.keyManager,
    );

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

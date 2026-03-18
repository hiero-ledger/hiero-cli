import type { CommandHandlerArgs, CoreApi, Logger } from '@/core';
import type {
  HookResult,
  PreOutputPreparationParams,
} from '@/core/hooks/types';
import type {
  BatchDataItem,
  BatchExecuteTransactionResult,
  TransactionResult,
} from '@/core/types/shared.types';

import { StateError } from '@/core';
import { AbstractHook } from '@/core/hooks/abstract-hook';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { TOKEN_CREATE_FT_FROM_FILE_COMMAND_NAME } from '@/plugins/token/commands/create-ft-from-file';
import { processTokenAssociations } from '@/plugins/token/utils/token-associations';
import { buildTokenDataFromFile } from '@/plugins/token/utils/token-data-builders';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { CreateFtFromFileNormalizedParamsSchema } from './types';

export class TokenCreateFtFromFileBatchStateHook extends AbstractHook {
  override async preOutputPreparationHook(
    args: CommandHandlerArgs,
    params: PreOutputPreparationParams<
      unknown,
      unknown,
      unknown,
      BatchExecuteTransactionResult
    >,
  ): Promise<HookResult> {
    const { api, logger } = args;
    const batchData = params.executeTransactionResult.updatedBatchData;
    if (!batchData.success) {
      return Promise.resolve({
        breakFlow: false,
        result: {
          message: 'Batch transaction status failure',
        },
      });
    }
    for (const batchDataItem of [...batchData.transactions].filter(
      (item) => item.command === TOKEN_CREATE_FT_FROM_FILE_COMMAND_NAME,
    )) {
      await this.saveToken(api, logger, batchDataItem);
    }
    return Promise.resolve({
      breakFlow: false,
      result: {
        message: 'success',
      },
    });
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
      throw new StateError(
        'Transaction completed but did not return a token ID',
        { context: { transactionId: innerTransactionResult.transactionId } },
      );
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

    api.alias.register({
      alias: normalisedParams.name,
      type: AliasType.Token,
      network: normalisedParams.network,
      entityId: innerTransactionResult.tokenId,
      createdAt: innerTransactionResult.consensusTimestamp,
    });
    logger.info(`   Name registered: ${normalisedParams.name}`);
  }
}

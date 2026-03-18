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
import { TOPIC_CREATE_COMMAND_NAME } from '@/plugins/topic/commands/create';
import { TopicCreateNormalisedParamsSchema } from '@/plugins/topic/hooks/batch-create/types';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

export class TopicCreateBatchStateHook extends AbstractHook {
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
      (item) => item.command === TOPIC_CREATE_COMMAND_NAME,
    )) {
      await this.saveTopic(api, logger, batchDataItem);
    }
    return {
      breakFlow: false,
      result: {
        message: 'success' as const,
      },
    };
  }

  private async saveTopic(
    api: CoreApi,
    logger: Logger,
    batchDataItem: BatchDataItem,
  ): Promise<void> {
    const parseResult = TopicCreateNormalisedParamsSchema.safeParse(
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

    if (!innerTransactionResult.topicId) {
      throw new StateError(
        'Transaction completed but did not return a topic ID, unable to save topic',
      );
    }

    const topicId = innerTransactionResult.topicId;
    const createdAt =
      innerTransactionResult.consensusTimestamp || new Date().toISOString();

    if (normalisedParams.alias) {
      api.alias.register({
        alias: normalisedParams.alias,
        type: AliasType.Topic,
        network: normalisedParams.network,
        entityId: topicId,
        createdAt,
      });
    }

    const topicData = {
      name: normalisedParams.alias,
      topicId,
      memo: normalisedParams.memo || '(No memo)',
      adminKeyRefIds: normalisedParams.adminKey
        ? [normalisedParams.adminKey.keyRefId]
        : [],
      submitKeyRefIds: normalisedParams.submitKey
        ? [normalisedParams.submitKey.keyRefId]
        : [],
      adminKeyThreshold: normalisedParams.adminKey ? 1 : 0,
      submitKeyThreshold: normalisedParams.submitKey ? 1 : 0,
      network: normalisedParams.network,
      createdAt,
    };

    const key = composeKey(normalisedParams.network, topicId);
    const topicState = new ZustandTopicStateHelper(api.state, logger);
    topicState.saveTopic(key, topicData);
  }
}

import type { CommandHandlerArgs } from '@/core';
import type {
  HookResult,
  PreOutputPreparationParams,
} from '@/core/hooks/types';
import type { TransactionResult } from '@/core/types/shared.types';

import { StateError } from '@/core';
import { AbstractHook } from '@/core/hooks/abstract-hook';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { TOPIC_CREATE_COMMAND_NAME } from '@/plugins/topic/commands/create';
import {
  type BatchDataItem,
  type BatchExecuteTransactionResult,
  TopicCreateNormalisedParamsSchema,
} from '@/plugins/topic/hooks/batch-create/types';
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
    const batchData = params.executeTransactionResult.updatedBatchData;
    const sortedTransactions = [...batchData.transactions].sort(
      (a, b) => a.order - b.order,
    );
    for (const batchDataItem of sortedTransactions.filter(
      (item) => item.command === TOPIC_CREATE_COMMAND_NAME,
    )) {
      await this.saveTopic(args, batchDataItem);
    }
    return {
      breakFlow: false,
      result: {
        message: 'success' as const,
      },
    };
  }

  private async saveTopic(
    args: CommandHandlerArgs,
    batchDataItem: BatchDataItem,
  ): Promise<void> {
    const { api, logger } = args;
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
      adminKeyRefId: normalisedParams.adminKey?.keyRefId,
      submitKeyRefId: normalisedParams.submitKey?.keyRefId,
      network: normalisedParams.network,
      createdAt,
    };

    const key = composeKey(normalisedParams.network, topicId);
    const topicState = new ZustandTopicStateHelper(api.state, logger);
    topicState.saveTopic(key, topicData);
  }
}

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
import { TOPIC_CREATE_COMMAND_NAME } from '@/plugins/topic/commands/create';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

import { TopicCreateNormalisedParamsSchema } from './types';

export class TopicCreateStateHook implements Hook<PostOutputPreparationHookParams> {
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
      (item) => item.command === TOPIC_CREATE_COMMAND_NAME,
    )) {
      await this.saveTopic(api, logger, batchDataItem);
    }
    return { breakFlow: false };
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
      if (api.alias.exists(normalisedParams.alias, normalisedParams.network)) {
        logger.warn(
          `Alias "${normalisedParams.alias}" already exists, skipping registration`,
        );
      } else {
        api.alias.register({
          alias: normalisedParams.alias,
          type: AliasType.Topic,
          network: normalisedParams.network,
          entityId: topicId,
          createdAt,
        });
      }
    }

    const topicData = {
      name: normalisedParams.alias,
      topicId,
      memo: normalisedParams.memo || '(No memo)',
      adminKeyRefIds: normalisedParams.adminKeys.map((k) => k.keyRefId),
      submitKeyRefIds: normalisedParams.submitKeys.map((k) => k.keyRefId),
      adminKeyThreshold: normalisedParams.adminKeyThreshold,
      submitKeyThreshold: normalisedParams.submitKeyThreshold,
      network: normalisedParams.network,
      createdAt,
    };

    const key = composeKey(normalisedParams.network, topicId);
    const topicState = new ZustandTopicStateHelper(api.state, logger);
    topicState.saveTopic(key, topicData);
  }
}

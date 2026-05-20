import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { ReceiptService } from '@/core/services/receipt/receipt-service.interface';
import type { TopicAliasService } from '@/plugins/topic/services/topic-alias.service.interface';
import type { TopicStateService } from '@/plugins/topic/services/topic-state.service.interface';

import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import {
  type BatchDataItem,
  OrchestratorSource,
  type TransactionResult,
} from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { TOPIC_CREATE_COMMAND_NAME } from '@/plugins/topic/commands/create';
import { TopicAliasServiceImpl } from '@/plugins/topic/services/topic-alias.service';
import { TopicStateServiceImpl } from '@/plugins/topic/services/topic-state.service';

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
    const { alias, logger, receipt, state } = params.args.api;
    if (!batchData.success) {
      return { breakFlow: false };
    }
    const topicState = new TopicStateServiceImpl(state, logger);
    const topicAlias = new TopicAliasServiceImpl(alias, logger);

    for (const batchDataItem of [...batchData.transactions].filter(
      (item) => item.command === TOPIC_CREATE_COMMAND_NAME,
    )) {
      await this.saveTopic(batchDataItem, {
        logger,
        receipt,
        topicAlias,
        topicState,
      });
    }
    return { breakFlow: false };
  }

  private async saveTopic(
    batchDataItem: BatchDataItem,
    deps: {
      logger: Logger;
      receipt: ReceiptService;
      topicAlias: TopicAliasService;
      topicState: TopicStateService;
    },
  ): Promise<void> {
    const parseResult = TopicCreateNormalisedParamsSchema.safeParse(
      batchDataItem.normalizedParams,
    );
    if (!parseResult.success) {
      deps.logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }
    const normalisedParams = parseResult.data;
    const innerTransactionId = batchDataItem.transactionId;
    if (!innerTransactionId) {
      deps.logger.warn(
        `No transaction ID found for batch transaction ${batchDataItem.order}`,
      );
      return;
    }

    const innerTransactionResult: TransactionResult =
      await deps.receipt.getReceipt({
        transactionId: innerTransactionId,
      });

    if (!innerTransactionResult.topicId) {
      deps.logger.warn(
        'Transaction completed but did not return a topic ID, skipping state save',
      );
      return;
    }

    const topicId = innerTransactionResult.topicId;
    const createdAt =
      innerTransactionResult.consensusTimestamp || new Date().toISOString();

    if (normalisedParams.alias) {
      deps.topicAlias.tryRegisterTopicAlias({
        alias: normalisedParams.alias,
        network: normalisedParams.network,
        topicId,
        createdAt,
      });
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
    deps.topicState.saveTopic(key, topicData);
  }
}

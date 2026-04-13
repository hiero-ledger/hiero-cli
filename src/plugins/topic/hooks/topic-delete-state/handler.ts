import type { CoreApi, Logger } from '@/core';
import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';
import type { BatchDataItem } from '@/core/types/shared.types';

import { OrchestratorSource } from '@/core';
import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import { TOPIC_DELETE_COMMAND_NAME } from '@/plugins/topic/commands/delete/handler';
import { TopicHelper } from '@/plugins/topic/topic-helper';

import { TopicDeleteNormalisedParamsSchema } from './types';

export class TopicDeleteStateHook implements Hook<PostOutputPreparationHookParams> {
  execute(params: PostOutputPreparationHookParams): Promise<HookResult> {
    const parsed = OrchestratorResultSchema.safeParse(
      params.executeTransactionResult,
    );
    if (!parsed.success || parsed.data.source !== OrchestratorSource.BATCH) {
      return Promise.resolve({ breakFlow: false });
    }
    const batchData = parsed.data.batchData;
    const { api, logger } = params.args;
    if (!batchData.success) {
      return Promise.resolve({ breakFlow: false });
    }
    for (const batchDataItem of [...batchData.transactions].filter(
      (item) => item.command === TOPIC_DELETE_COMMAND_NAME,
    )) {
      this.applyDeleteFromBatchItem(api, logger, batchDataItem);
    }
    return Promise.resolve({ breakFlow: false });
  }

  private applyDeleteFromBatchItem(
    api: CoreApi,
    logger: Logger,
    batchDataItem: BatchDataItem,
  ): void {
    const parseResult = TopicDeleteNormalisedParamsSchema.safeParse(
      batchDataItem.normalizedParams,
    );
    if (!parseResult.success) {
      logger.warn(
        'Topic delete batch item skipped: normalized params did not match schema',
      );
      return;
    }
    const normalised = parseResult.data;
    if (normalised.stateOnly) {
      return;
    }
    const topicHelper = new TopicHelper(api.alias, api.state, logger);
    topicHelper.removeTopicFromLocalState(
      normalised.topicToDelete,
      normalised.network,
    );
  }
}

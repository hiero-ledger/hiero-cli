import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { BatchDataItem } from '@/core/types/shared.types';
import type { TopicCleanupService } from '@/plugins/topic/services/topic-cleanup.service.interface';

import { OrchestratorSource } from '@/core';
import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import { TOPIC_DELETE_COMMAND_NAME } from '@/plugins/topic/commands/delete/handler';
import { TopicCleanupServiceImpl } from '@/plugins/topic/services/topic-cleanup.service';
import { TopicStateServiceImpl } from '@/plugins/topic/services/topic-state.service';

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
    const { alias, logger, state } = params.args.api;
    if (!batchData.success) {
      return Promise.resolve({ breakFlow: false });
    }
    const topicState = new TopicStateServiceImpl(state, logger);
    const topicCleanup = new TopicCleanupServiceImpl(alias, topicState, logger);

    for (const batchDataItem of [...batchData.transactions].filter(
      (item) => item.command === TOPIC_DELETE_COMMAND_NAME,
    )) {
      this.applyDeleteFromBatchItem(batchDataItem, { logger, topicCleanup });
    }
    return Promise.resolve({ breakFlow: false });
  }

  private applyDeleteFromBatchItem(
    batchDataItem: BatchDataItem,
    deps: { logger: Logger; topicCleanup: TopicCleanupService },
  ): void {
    const parseResult = TopicDeleteNormalisedParamsSchema.safeParse(
      batchDataItem.normalizedParams,
    );
    if (!parseResult.success) {
      deps.logger.warn(
        'Topic delete batch item skipped: normalized params did not match schema',
      );
      return;
    }
    const normalised = parseResult.data;
    if (normalised.stateOnly) {
      return;
    }
    deps.topicCleanup.removeTopicFromLocalState(
      normalised.topicToDelete,
      normalised.network,
    );
  }
}

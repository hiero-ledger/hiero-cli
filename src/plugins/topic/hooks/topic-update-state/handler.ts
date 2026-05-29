import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';

import { OrchestratorSource } from '@/core';
import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import { TOPIC_UPDATE_COMMAND_NAME } from '@/plugins/topic/commands/update/handler';
import { TopicAliasServiceImpl } from '@/plugins/topic/services/topic-alias.service';
import { TopicStateServiceImpl } from '@/plugins/topic/services/topic-state.service';

export class TopicUpdateStateHook implements Hook<PostOutputPreparationHookParams> {
  async execute(params: PostOutputPreparationHookParams): Promise<HookResult> {
    const parsed = OrchestratorResultSchema.safeParse(
      params.executeTransactionResult,
    );
    if (!parsed.success || parsed.data.source !== OrchestratorSource.BATCH) {
      return { breakFlow: false };
    }
    if (!parsed.data.batchData.success) {
      return { breakFlow: false };
    }

    const { api } = params.args;
    const topicAlias = new TopicAliasServiceImpl(api.alias, api.logger);
    const topicState = new TopicStateServiceImpl(
      api.state,
      api.logger,
      api.receipt,
      api.alias,
      topicAlias,
    );

    for (const item of parsed.data.batchData.transactions.filter(
      (i) => i.command === TOPIC_UPDATE_COMMAND_NAME,
    )) {
      await topicState.applyTopicUpdateFromBatchItem(item);
    }
    return { breakFlow: false };
  }
}

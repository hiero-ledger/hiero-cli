import type { CommandHandlerArgs, Logger } from '@/core';
import type { CoreApi } from '@/core/core-api/core-api.interface';
import type {
  HookResult,
  PreOutputPreparationParams,
} from '@/core/hooks/types';
import type {
  BatchDataItem,
  BatchExecuteTransactionResult,
} from '@/core/types/shared.types';

import { AbstractHook } from '@/core/hooks/abstract-hook';
import { TOPIC_DELETE_COMMAND_NAME } from '@/plugins/topic/commands/delete/handler';
import { TopicHelper } from '@/plugins/topic/topic-helper';

import { TopicDeleteNormalisedParamsSchema } from './types';

export class TopicDeleteBatchStateHook extends AbstractHook {
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
      (item) => item.command === TOPIC_DELETE_COMMAND_NAME,
    )) {
      this.applyDeleteFromBatchItem(api, logger, batchDataItem);
    }
    return {
      breakFlow: false,
      result: {
        message: 'success' as const,
      },
    };
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

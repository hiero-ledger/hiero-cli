import type { CoreApi, Logger } from '@/core';
import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';
import type { BatchDataItem } from '@/core/types/shared.types';

import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import { composeKey } from '@/core/utils/key-composer';
import { TOPIC_UPDATE_COMMAND_NAME } from '@/plugins/topic/commands/update/handler';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

import { TopicUpdateNormalisedParamsSchema } from './types';

export class TopicUpdateStateHook implements Hook<PostOutputPreparationHookParams> {
  execute(params: PostOutputPreparationHookParams): Promise<HookResult> {
    const parsed = OrchestratorResultSchema.safeParse(
      params.executeTransactionResult,
    );
    if (!parsed.success || parsed.data.source !== 'batch') {
      return Promise.resolve({ breakFlow: false });
    }
    const batchData = parsed.data.batchData;
    const { api, logger } = params.args;

    if (!batchData.success) {
      return Promise.resolve({ breakFlow: false });
    }

    for (const batchDataItem of [...batchData.transactions].filter(
      (item) => item.command === TOPIC_UPDATE_COMMAND_NAME,
    )) {
      this.updateTopicState(api, logger, batchDataItem);
    }

    return Promise.resolve({ breakFlow: false });
  }

  private updateTopicState(
    api: CoreApi,
    logger: Logger,
    batchDataItem: BatchDataItem,
  ): void {
    const parseResult = TopicUpdateNormalisedParamsSchema.safeParse(
      batchDataItem.normalizedParams,
    );

    if (!parseResult.success) {
      logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }

    const p = parseResult.data;
    const existing = p.existingTopicData;

    const updatedAdminKeyRefIds = p.newAdminKeys
      ? p.newAdminKeys.map((k) => k.keyRefId)
      : existing.adminKeyRefIds;
    const updatedAdminKeyThreshold = p.newAdminKeys
      ? (p.newAdminKeyThreshold ?? p.newAdminKeys.length)
      : existing.adminKeyThreshold;

    let updatedSubmitKeyRefIds: string[];
    let updatedSubmitKeyThreshold: number;
    if (p.newSubmitKeys === null) {
      updatedSubmitKeyRefIds = [];
      updatedSubmitKeyThreshold = 0;
    } else if (p.newSubmitKeys !== undefined) {
      updatedSubmitKeyRefIds = p.newSubmitKeys.map((k) => k.keyRefId);
      updatedSubmitKeyThreshold =
        p.newSubmitKeyThreshold ?? p.newSubmitKeys.length;
    } else {
      updatedSubmitKeyRefIds = existing.submitKeyRefIds;
      updatedSubmitKeyThreshold = existing.submitKeyThreshold;
    }

    let updatedMemo: string | undefined;
    if (p.memo === null) {
      updatedMemo = undefined;
    } else if (p.memo !== undefined) {
      updatedMemo = p.memo;
    } else {
      updatedMemo = existing.memo;
    }

    let updatedAutoRenewAccount: string | undefined;
    if (p.autoRenewAccountId === null) {
      updatedAutoRenewAccount = undefined;
    } else if (p.autoRenewAccountId !== undefined) {
      updatedAutoRenewAccount = p.autoRenewAccountId;
    } else {
      updatedAutoRenewAccount = existing.autoRenewAccount;
    }

    const updatedTopicData = {
      name: existing.name,
      topicId: existing.topicId,
      memo: updatedMemo,
      adminKeyRefIds: updatedAdminKeyRefIds,
      submitKeyRefIds: updatedSubmitKeyRefIds,
      adminKeyThreshold: updatedAdminKeyThreshold,
      submitKeyThreshold: updatedSubmitKeyThreshold,
      autoRenewAccount: updatedAutoRenewAccount,
      autoRenewPeriod: p.autoRenewPeriod ?? existing.autoRenewPeriod,
      expirationTime: p.expirationTime ?? existing.expirationTime,
      network: existing.network,
      createdAt: existing.createdAt,
    };

    const stateKey = composeKey(p.network, p.topicId);
    const topicState = new ZustandTopicStateHelper(api.state, logger);
    topicState.saveTopic(stateKey, updatedTopicData);
  }
}

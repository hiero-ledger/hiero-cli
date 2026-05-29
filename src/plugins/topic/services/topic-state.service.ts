import type { Logger, StateService } from '@/core';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { ReceiptService } from '@/core/services/receipt/receipt-service.interface';
import type {
  BatchDataItem,
  TransactionResult,
} from '@/core/types/shared.types';
import type { TopicAliasService } from '@/plugins/topic/services/topic-alias.service.interface';
import type { TopicStateService } from './topic-state.service.interface';

import { AccountId } from '@hiero-ledger/sdk';

import { ValidationError } from '@/core/errors';
import { AliasType } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { TOPIC_CREATE_COMMAND_NAME } from '@/plugins/topic/commands/create';
import { TOPIC_DELETE_COMMAND_NAME } from '@/plugins/topic/commands/delete/handler';
import { TOPIC_UPDATE_COMMAND_NAME } from '@/plugins/topic/commands/update/handler';
import { TOPIC_NAMESPACE } from '@/plugins/topic/constants';
import { TopicCreateNormalisedParamsSchema } from '@/plugins/topic/hooks/topic-create-state/types';
import { TopicDeleteNormalisedParamsSchema } from '@/plugins/topic/hooks/topic-delete-state/types';
import { TopicUpdateNormalisedParamsSchema } from '@/plugins/topic/hooks/topic-update-state/types';
import { safeParseTopicData, type TopicData } from '@/plugins/topic/schema';

export class TopicStateServiceImpl implements TopicStateService {
  private readonly namespace = TOPIC_NAMESPACE;

  constructor(
    private readonly state: StateService,
    private readonly logger: Logger,
    private readonly receipt: ReceiptService,
    private readonly alias: AliasService,
    private readonly topicAlias: TopicAliasService,
  ) {}

  saveTopic(key: string, topicData: TopicData): void {
    this.logger.debug(`[TOPIC STATE] Saving topic: ${key}`);

    const validation = safeParseTopicData(topicData);
    if (!validation.success) {
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new ValidationError(`Invalid topic data: ${errors}`);
    }

    this.state.set(this.namespace, key, topicData);
    this.logger.debug(`[TOPIC STATE] Topic saved: ${key}`);
  }

  loadTopic(key: string): TopicData | null {
    this.logger.debug(`[TOPIC STATE] Loading topic: ${key}`);
    const data = this.state.get<TopicData>(this.namespace, key);

    if (data) {
      const validation = safeParseTopicData(data);
      if (!validation.success) {
        this.logger.warn(
          `[TOPIC STATE] Invalid data for topic: ${key}. Errors: ${validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        );
        return null;
      }
    }

    return data || null;
  }

  listTopics(): TopicData[] {
    this.logger.debug('[TOPIC STATE] Listing all topics');
    const allData = this.state.list<TopicData>(this.namespace);
    return allData.filter((data) => safeParseTopicData(data).success);
  }

  deleteTopic(key: string): void {
    this.logger.debug(`[TOPIC STATE] Deleting topic: ${key}`);
    this.state.delete(this.namespace, key);
  }

  async applyTopicCreateFromBatchItem(item: BatchDataItem): Promise<void> {
    if (item.command !== TOPIC_CREATE_COMMAND_NAME) return;
    const parsed = TopicCreateNormalisedParamsSchema.safeParse(
      item.normalizedParams,
    );
    if (!parsed.success) {
      this.logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }
    const params = parsed.data;
    const receipt = await this.fetchReceiptOrWarn(item);
    if (!receipt || !receipt.topicId) return;

    const topicId = receipt.topicId;
    const createdAt = receipt.consensusTimestamp || new Date().toISOString();

    if (params.alias) {
      this.topicAlias.tryRegisterTopicAlias({
        alias: params.alias,
        network: params.network,
        topicId,
        createdAt,
      });
    }

    const topicData = {
      name: params.alias,
      topicId,
      memo: params.memo || '(No memo)',
      adminKeyRefIds: params.adminKeys.map((k) => k.keyRefId),
      submitKeyRefIds: params.submitKeys.map((k) => k.keyRefId),
      adminKeyThreshold: params.adminKeyThreshold,
      submitKeyThreshold: params.submitKeyThreshold,
      network: params.network,
      createdAt,
    };

    const key = composeKey(params.network, topicId);
    this.saveTopic(key, topicData);
  }

  applyTopicUpdateFromBatchItem(item: BatchDataItem): Promise<void> {
    if (item.command !== TOPIC_UPDATE_COMMAND_NAME) return Promise.resolve();
    const parsed = TopicUpdateNormalisedParamsSchema.safeParse(
      item.normalizedParams,
    );
    if (!parsed.success) {
      this.logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return Promise.resolve();
    }
    const p = parsed.data;
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
    this.saveTopic(stateKey, updatedTopicData);
    return Promise.resolve();
  }

  applyTopicDeleteFromBatchItem(item: BatchDataItem): Promise<void> {
    if (item.command !== TOPIC_DELETE_COMMAND_NAME) return Promise.resolve();
    const parsed = TopicDeleteNormalisedParamsSchema.safeParse(
      item.normalizedParams,
    );
    if (!parsed.success) {
      this.logger.warn(
        'Topic delete batch item skipped: normalized params did not match schema',
      );
      return Promise.resolve();
    }
    const normalised = parsed.data;
    if (normalised.stateOnly) return Promise.resolve();

    this.removeTopicFromLocalState(
      normalised.topicToDelete.topicId,
      normalised.network,
    );
    return Promise.resolve();
  }

  private async fetchReceiptOrWarn(
    item: BatchDataItem,
  ): Promise<TransactionResult | null> {
    const transactionId = item.transactionId;
    if (!transactionId) {
      this.logger.warn(
        `No transaction ID found for batch transaction ${item.order}`,
      );
      return null;
    }
    const receipt = await this.receipt.getReceipt({ transactionId });
    if (!receipt.topicId) {
      this.logger.warn(
        'Transaction completed but did not return a topic ID, skipping state save',
      );
      return null;
    }
    return receipt;
  }

  private removeTopicFromLocalState(
    topicId: string,
    network: TopicData['network'],
  ): void {
    const topicIdNorm = AccountId.fromString(topicId).toString();
    const aliasesForTopic = this.alias
      .list({ network, type: AliasType.Topic })
      .filter(
        (rec) =>
          rec.network === network &&
          rec.type === AliasType.Topic &&
          rec.entityId !== undefined &&
          AccountId.fromString(rec.entityId).toString() === topicIdNorm,
      );

    for (const rec of aliasesForTopic) {
      this.alias.remove(rec.alias, network);
      this.logger.info(`Removed alias '${rec.alias}' on ${network}`);
    }

    const key = composeKey(network, topicIdNorm);
    this.deleteTopic(key);
  }
}

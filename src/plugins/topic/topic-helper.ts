/**
 * Topic plugin helpers: alias + topic state orchestration.
 * Add methods here as the topic plugin grows (one shared helper per plugin).
 */
import type { Logger, StateService } from '@/core';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TopicData } from '@/plugins/topic/schema';

import { AccountId } from '@hashgraph/sdk';

import { AliasType } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';

import { ZustandTopicStateHelper } from './zustand-state-helper';

export class TopicHelper {
  private readonly alias: AliasService;
  private readonly logger: Logger;
  private readonly topicState: ZustandTopicStateHelper;

  constructor(alias: AliasService, state: StateService, logger: Logger) {
    this.alias = alias;
    this.logger = logger;
    this.topicState = new ZustandTopicStateHelper(state, logger);
  }

  private normalizeEntityId(entityId: string): string {
    return AccountId.fromString(entityId).toString();
  }

  removeTopicFromLocalState(
    topicToDelete: TopicData,
    network: SupportedNetwork,
  ): string[] {
    const topicIdNorm = this.normalizeEntityId(topicToDelete.topicId);
    const aliasesForTopic = this.alias
      .list({ network, type: AliasType.Topic })
      .filter(
        (rec) =>
          rec.entityId !== undefined &&
          this.normalizeEntityId(rec.entityId) === topicIdNorm,
      );

    const removedAliases: string[] = [];
    for (const rec of aliasesForTopic) {
      this.alias.remove(rec.alias, network);
      removedAliases.push(`${rec.alias} (${network})`);
      this.logger.info(`🧹 Removed alias '${rec.alias}' on ${network}`);
    }

    const key = composeKey(network, topicIdNorm);
    this.topicState.deleteTopic(key);

    return removedAliases;
  }
}

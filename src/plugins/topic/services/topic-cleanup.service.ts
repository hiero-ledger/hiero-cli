import type { Logger } from '@/core';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TopicData } from '@/plugins/topic/schema';
import type { TopicCleanupService } from './topic-cleanup.service.interface';
import type { TopicStateService } from './topic-state.service.interface';

import { AccountId } from '@hiero-ledger/sdk';

import { AliasType } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';

export class TopicCleanupServiceImpl implements TopicCleanupService {
  constructor(
    private readonly alias: AliasService,
    private readonly topicState: TopicStateService,
    private readonly logger: Logger,
  ) {}

  removeTopicFromLocalState(
    topicToDelete: TopicData,
    network: SupportedNetwork,
  ): string[] {
    const topicIdNorm = this.normalizeEntityId(topicToDelete.topicId);
    const aliasesForTopic = this.alias
      .list({ network, type: AliasType.Topic })
      .filter(
        (rec) =>
          rec.network === network &&
          rec.type === AliasType.Topic &&
          rec.entityId !== undefined &&
          this.normalizeEntityId(rec.entityId) === topicIdNorm,
      );

    const removedAliases: string[] = [];
    for (const rec of aliasesForTopic) {
      this.alias.remove(rec.alias, network);
      removedAliases.push(`${rec.alias} (${network})`);
      this.logger.info(`Removed alias '${rec.alias}' on ${network}`);
    }

    const key = composeKey(network, topicIdNorm);
    this.topicState.deleteTopic(key);

    return removedAliases;
  }

  private normalizeEntityId(entityId: string): string {
    return AccountId.fromString(entityId).toString();
  }
}

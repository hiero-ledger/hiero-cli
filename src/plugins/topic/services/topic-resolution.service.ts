import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TopicResolutionService } from './topic-resolution.service.interface';

import { NotFoundError, StateError } from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas';
import { AliasType } from '@/core/types/shared.types';

export class TopicResolutionServiceImpl implements TopicResolutionService {
  constructor(private readonly alias: AliasService) {}

  resolveTopicId(topicRef: string, network: SupportedNetwork): string {
    const topicIdParseResult = EntityIdSchema.safeParse(topicRef);

    if (topicIdParseResult.success) {
      return topicIdParseResult.data;
    }

    const topicAliasResult = this.alias.resolve(
      topicRef,
      AliasType.Topic,
      network,
    );

    if (!topicAliasResult) {
      throw new NotFoundError(
        `Topic alias "${topicRef}" not found for network ${network}. Please provide either a valid topic alias or topic ID.`,
        { context: { alias: topicRef, network } },
      );
    }

    if (!topicAliasResult.entityId) {
      throw new StateError(
        `Topic alias "${topicRef}" does not have an associated topic ID.`,
        { context: { alias: topicRef } },
      );
    }

    return topicAliasResult.entityId;
  }

  resolveTopicEntityIdOrThrow(
    topicRef: string,
    network: SupportedNetwork,
  ): string {
    return this.resolveTopicId(topicRef, network);
  }
}

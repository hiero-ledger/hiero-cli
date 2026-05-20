import type { Logger } from '@/core';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type {
  RegisterTopicAliasParams,
  TopicAliasService,
} from './topic-alias.service.interface';

import { AliasType } from '@/core/types/shared.types';

export class TopicAliasServiceImpl implements TopicAliasService {
  constructor(
    private readonly alias: AliasService,
    private readonly logger: Logger,
  ) {}

  tryRegisterTopicAlias(params: RegisterTopicAliasParams): boolean {
    if (this.alias.exists(params.alias, params.network)) {
      this.logger.warn(
        `Alias "${params.alias}" already exists, skipping registration`,
      );
      return false;
    }

    this.alias.register({
      alias: params.alias,
      type: AliasType.Topic,
      network: params.network,
      entityId: params.topicId,
      createdAt: params.createdAt,
    });
    return true;
  }
}

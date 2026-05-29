import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { Filter } from '@/core/services/mirrornode/types';
import type { TopicFindMessageItemOutput } from '@/plugins/topic/commands/find-message/output';
import type { TopicMessageQueryService } from './topic-message-query.service.interface';

import { transformMessageToOutput } from '@/plugins/topic/utils/message-helpers';

export class TopicMessageQueryServiceImpl implements TopicMessageQueryService {
  constructor(private readonly mirror: HederaMirrornodeService) {}

  async fetchFilteredMessages(
    topicId: string,
    filters: Filter[] | undefined,
  ): Promise<TopicFindMessageItemOutput[]> {
    const response = await this.mirror.getTopicMessages({ topicId, filters });
    return response.messages.map(transformMessageToOutput).reverse();
  }
}

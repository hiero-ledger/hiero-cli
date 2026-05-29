import type { Filter } from '@/core/services/mirrornode/types';
import type { TopicFindMessageItemOutput } from '@/plugins/topic/commands/find-message/output';

export interface TopicMessageQueryService {
  fetchFilteredMessages(
    topicId: string,
    filters: Filter[] | undefined,
  ): Promise<TopicFindMessageItemOutput[]>;
}

import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TopicData } from '@/plugins/topic/schema';

export interface TopicCleanupService {
  removeTopicFromLocalState(
    topicToDelete: TopicData,
    network: SupportedNetwork,
  ): string[];
}

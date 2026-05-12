import type { SupportedNetwork } from '@/core/types/shared.types';

export interface TopicResolutionService {
  resolveTopicId(topicRef: string, network: SupportedNetwork): string;
  resolveTopicEntityIdOrThrow(
    topicRef: string,
    network: SupportedNetwork,
  ): string;
}

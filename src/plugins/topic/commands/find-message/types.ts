import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TopicFindMessageInput } from './input';

export interface FindMessageNormalisedParams extends TopicFindMessageInput {
  topicId: string;
  currentNetwork: SupportedNetwork;
}

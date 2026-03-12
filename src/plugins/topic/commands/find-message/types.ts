import type { SupportedNetwork } from '@/core/types/shared.types';
import type { FindMessageInput } from './input';

export interface FindMessageNormalisedParams extends FindMessageInput {
  topicId: string;
  currentNetwork: SupportedNetwork;
}

import type { FindMessageInput } from './input';
import type { SupportedNetwork } from '@/core/types/shared.types';

export interface FindMessageNormalisedParams extends FindMessageInput {
  topicId: string;
  currentNetwork: SupportedNetwork;
}

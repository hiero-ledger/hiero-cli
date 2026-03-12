import type { SupportedNetwork } from '@/core/types/shared.types';

export interface DeleteTopicNormalisedParams {
  topicRef: string;
  network: SupportedNetwork;
  key: string;
}

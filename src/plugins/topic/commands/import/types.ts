import type { SupportedNetwork } from '@/core/types/shared.types';

export interface ImportTopicNormalisedParams {
  topicId: string;
  alias?: string;
  network: SupportedNetwork;
}

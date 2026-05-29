import type { SupportedNetwork } from '@/core/types/shared.types';

export interface RegisterTopicAliasParams {
  alias: string;
  network: SupportedNetwork;
  topicId: string;
  createdAt: string;
}

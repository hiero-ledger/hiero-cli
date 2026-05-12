import type { SupportedNetwork } from '@/core/types/shared.types';

export interface RegisterTopicAliasParams {
  alias: string;
  network: SupportedNetwork;
  topicId: string;
  createdAt: string;
}

export interface TopicAliasService {
  assertTopicAliasAvailable(
    alias: string | undefined,
    network: SupportedNetwork,
  ): void;
  registerTopicAlias(params: RegisterTopicAliasParams): void;
  tryRegisterTopicAlias(params: RegisterTopicAliasParams): boolean;
}

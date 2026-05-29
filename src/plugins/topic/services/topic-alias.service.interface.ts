import type { RegisterTopicAliasParams } from '@/plugins/topic/services/topic-alias.types';

export interface TopicAliasService {
  tryRegisterTopicAlias(params: RegisterTopicAliasParams): boolean;
}

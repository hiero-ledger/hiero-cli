/**
 * Topic Resolver Utilities
 * Utilities for resolving topic IDs from aliases or validating topic IDs
 */
import { EntityIdSchema } from '@/core/schemas';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';

/**
 * Resolve topic ID from alias or validate topic ID
 * @param topicIdOrAlias - Topic ID (e.g., "0.0.123") or alias
 * @param aliasService - Alias service instance
 * @param currentNetwork - Current network name
 * @returns Topic ID string
 * @throws Error if topic alias not found or invalid
 */
export function resolveTopicId(
  topicIdOrAlias: string,
  aliasService: AliasService,
  currentNetwork: SupportedNetwork,
): string {
  const topicIdParseResult = EntityIdSchema.safeParse(topicIdOrAlias);

  if (topicIdParseResult.success) {
    return topicIdParseResult.data;
  }

  const topicAliasResult = aliasService.resolve(
    topicIdOrAlias,
    'topic',
    currentNetwork,
  );

  if (!topicAliasResult) {
    throw new Error(
      `Topic alias "${topicIdOrAlias}" not found for network ${currentNetwork}. Please provide either a valid topic alias or topic ID.`,
    );
  }

  if (!topicAliasResult.entityId) {
    throw new Error(
      `Topic alias "${topicIdOrAlias}" does not have an associated topic ID.`,
    );
  }

  return topicAliasResult.entityId;
}

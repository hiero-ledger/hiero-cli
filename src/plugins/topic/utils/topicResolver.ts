/**
 * Topic Resolver Utilities
 * Utilities for resolving topic IDs from aliases or validating topic IDs
 */
import { CommandExecutionResult, CoreApi } from '../../../core';
import { Status } from '../../../core/shared/constants';
import { EntityIdSchema } from '../../../core/schemas';
import type { SupportedNetwork } from '../../../core/types/shared.types';

/**
 * Resolve topic ID from alias or validate topic ID
 * @param topicIdOrAlias - Topic ID (e.g., "0.0.123") or alias
 * @param api - Core API instance
 * @param currentNetwork - Current network name
 * @returns Object with topicId if successful, or CommandExecutionResult with error
 */
export function resolveTopicId(
  topicIdOrAlias: string,
  api: CoreApi,
  currentNetwork: SupportedNetwork,
): { topicId: string } | CommandExecutionResult {
  const topicIdParseResult = EntityIdSchema.safeParse(topicIdOrAlias);

  if (topicIdParseResult.success) {
    return { topicId: topicIdParseResult.data };
  }

  const topicAliasResult = api.alias.resolve(
    topicIdOrAlias,
    'topic',
    currentNetwork,
  );

  if (!topicAliasResult) {
    return {
      status: Status.Failure,
      errorMessage: `Topic alias "${topicIdOrAlias}" not found for network ${currentNetwork}. Please provide either a valid topic alias or topic ID.`,
    };
  }

  if (!topicAliasResult.entityId) {
    return {
      status: Status.Failure,
      errorMessage: `Topic alias "${topicIdOrAlias}" does not have an associated topic ID.`,
    };
  }

  return { topicId: topicAliasResult.entityId };
}

/**
 * Topic Resolver Utilities
 * Utilities for resolving topic IDs from aliases or validating topic IDs
 */
import { CommandExecutionResult, CoreApi } from '../../../core';
import { Status } from '../../../core/shared/constants';
import { EntityIdSchema } from '../../../core/schemas';
import type { SupportedNetwork } from '../../../core/types/shared.types';

/**
 * Result type for topic ID resolution
 */
export type ResolveTopicIdResult =
  | { success: true; topicId: string }
  | { success: false; error: CommandExecutionResult };

/**
 * Resolve topic ID from alias or validate topic ID
 * @param topicIdOrAlias - Topic ID (e.g., "0.0.123") or alias
 * @param api - Core API instance
 * @param currentNetwork - Current network name
 * @returns ResolveTopicIdResult with topicId or error
 */
export function resolveTopicId(
  topicIdOrAlias: string,
  api: CoreApi,
  currentNetwork: SupportedNetwork,
): ResolveTopicIdResult {
  const topicIdParseResult = EntityIdSchema.safeParse(topicIdOrAlias);
  if (topicIdParseResult.success) {
    return { success: true, topicId: topicIdParseResult.data };
  }

  const topicAliasResult = api.alias.resolve(
    topicIdOrAlias,
    'topic',
    currentNetwork,
  );

  if (!topicAliasResult) {
    return {
      success: false,
      error: {
        status: Status.Failure,
        errorMessage: `Topic alias "${topicIdOrAlias}" not found for network ${currentNetwork}. Please provide either a valid topic alias or topic ID.`,
      },
    };
  }

  if (!topicAliasResult.entityId) {
    return {
      success: false,
      error: {
        status: Status.Failure,
        errorMessage: `Topic alias "${topicIdOrAlias}" does not have an associated topic ID.`,
      },
    };
  }

  return { success: true, topicId: topicAliasResult.entityId };
}

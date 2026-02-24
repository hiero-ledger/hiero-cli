/**
 * Topic Delete Command Handler
 * Handles deleting topics from state using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { DeleteTopicOutput } from './output';

import { EntityIdSchema } from '@/core/schemas';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

import { DeleteTopicInputSchema } from './input';

export async function deleteTopic(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const topicState = new ZustandTopicStateHelper(api.state, logger);

  logger.info(`Deleting topic...`);

  try {
    const validArgs = DeleteTopicInputSchema.parse(args.args);
    const topicRef = validArgs.topic;
    const isEntityId = EntityIdSchema.safeParse(topicRef).success;
    const network = api.network.getCurrentNetwork();
    let key;

    if (isEntityId) {
      key = composeKey(network, topicRef);
    } else {
      const topicAlias = api.alias.resolveOrThrow(
        topicRef,
        ALIAS_TYPE.Topic,
        network,
      );
      if (!topicAlias.entityId) {
        throw new Error(
          `Alias for topic ${topicRef} is missing entity ID in its record`,
        );
      }
      key = composeKey(network, topicAlias.entityId);
    }
    const topicToDelete = topicState.loadTopic(key);
    if (!topicToDelete) {
      throw new Error(`Topic with identifier '${topicRef}' not found`);
    }

    const aliasesForTopic = api.alias
      .list({ network: network, type: ALIAS_TYPE.Topic })
      .filter((rec) => rec.entityId === topicToDelete.topicId);

    const removedAliases: string[] = [];
    for (const rec of aliasesForTopic) {
      api.alias.remove(rec.alias, network);
      removedAliases.push(`${rec.alias} (${network})`);
      logger.info(`🧹 Removed alias '${rec.alias}' on ${network}`);
    }

    topicState.deleteTopic(topicToDelete.topicId);

    const outputData: DeleteTopicOutput = {
      deletedTopic: {
        name: topicToDelete.name,
        topicId: topicToDelete.topicId,
      },
      removedAliases,
      network,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to delete topic', error),
    };
  }
}

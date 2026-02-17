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
    let topicToDelete;

    if (isEntityId) {
      topicToDelete = topicState.findTopicByTopicId(topicRef);
      if (!topicToDelete) {
        throw new Error(`Topic with ID '${topicRef}' not found`);
      }
    } else {
      const topics = topicState.listTopics();
      topicToDelete = topics.find((t) => t.name === topicRef);
      if (!topicToDelete) {
        throw new Error(`Topic with name '${topicRef}' not found`);
      }
    }

    const currentNetwork = api.network.getCurrentNetwork();
    const aliasesForTopic = api.alias
      .list({ network: currentNetwork, type: ALIAS_TYPE.Topic })
      .filter((rec) => rec.entityId === topicToDelete.topicId);

    const removedAliases: string[] = [];
    for (const rec of aliasesForTopic) {
      api.alias.remove(rec.alias, currentNetwork);
      removedAliases.push(`${rec.alias} (${currentNetwork})`);
      logger.info(`🧹 Removed alias '${rec.alias}' on ${currentNetwork}`);
    }

    topicState.deleteTopic(topicToDelete.topicId);

    const outputData: DeleteTopicOutput = {
      deletedTopic: {
        name: topicToDelete.name,
        topicId: topicToDelete.topicId,
      },
      removedAliases,
      network: currentNetwork,
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

import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { DeleteTopicOutput } from './output';

import { NotFoundError } from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

import { DeleteTopicInputSchema } from './input';

export async function deleteTopic(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const topicState = new ZustandTopicStateHelper(api.state, logger);

  logger.info(`Deleting topic...`);

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
      throw new NotFoundError(
        `Alias for topic ${topicRef} is missing entity ID in its record`,
      );
    }
    key = composeKey(network, topicAlias.entityId);
  }
  const topicToDelete = topicState.loadTopic(key);
  if (!topicToDelete) {
    throw new NotFoundError(`Topic with identifier '${topicRef}' not found`);
  }

  const aliasesForTopic = api.alias
    .list({ network, type: ALIAS_TYPE.Topic })
    .filter((rec) => rec.entityId === topicToDelete.topicId);

  const removedAliases: string[] = [];
  for (const rec of aliasesForTopic) {
    api.alias.remove(rec.alias, network);
    removedAliases.push(`${rec.alias} (${network})`);
    logger.info(`🧹 Removed alias '${rec.alias}' on ${network}`);
  }

  topicState.deleteTopic(topicToDelete.topicId);

  const result: DeleteTopicOutput = {
    deletedTopic: {
      name: topicToDelete.name,
      topicId: topicToDelete.topicId,
    },
    removedAliases,
    network,
  };

  return { result };
}

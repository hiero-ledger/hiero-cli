import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { DeleteTopicOutput } from './output';
import type { DeleteTopicNormalisedParams } from './types';

import { NotFoundError } from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

import { DeleteTopicInputSchema } from './input';

export class DeleteTopicCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const topicState = new ZustandTopicStateHelper(api.state, logger);

    logger.info(`Deleting topic...`);

    const validArgs = DeleteTopicInputSchema.parse(args.args);
    const topicRef = validArgs.topic;
    const isEntityId = EntityIdSchema.safeParse(topicRef).success;
    const network = api.network.getCurrentNetwork();
    let key: string;

    if (isEntityId) {
      key = composeKey(network, topicRef);
    } else {
      const topicAlias = api.alias.resolveOrThrow(
        topicRef,
        AliasType.Topic,
        network,
      );
      if (!topicAlias.entityId) {
        throw new NotFoundError(
          `Alias for topic ${topicRef} is missing entity ID in its record`,
        );
      }
      key = composeKey(network, topicAlias.entityId);
    }

    const normalisedParams: DeleteTopicNormalisedParams = {
      topicRef,
      network,
      key,
    };

    const topicToDelete = topicState.loadTopic(normalisedParams.key);
    if (!topicToDelete) {
      throw new NotFoundError(
        `Topic with identifier '${normalisedParams.topicRef}' not found`,
      );
    }

    const aliasesForTopic = api.alias
      .list({ network: normalisedParams.network, type: AliasType.Topic })
      .filter((rec) => rec.entityId === topicToDelete.topicId);

    const removedAliases: string[] = [];
    for (const rec of aliasesForTopic) {
      api.alias.remove(rec.alias, normalisedParams.network);
      removedAliases.push(`${rec.alias} (${normalisedParams.network})`);
      logger.info(
        `🧹 Removed alias '${rec.alias}' on ${normalisedParams.network}`,
      );
    }

    topicState.deleteTopic(normalisedParams.key);

    const result: DeleteTopicOutput = {
      deletedTopic: {
        name: topicToDelete.name,
        topicId: topicToDelete.topicId,
      },
      removedAliases,
      network: normalisedParams.network,
    };

    return { result };
  }
}

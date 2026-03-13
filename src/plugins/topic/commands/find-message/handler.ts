import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { FindMessagesOutput } from './output';
import type { FindMessageNormalisedParams } from './types';

import { fetchFilteredMessages } from '@/plugins/topic/utils/message-helpers';
import { buildApiFilters } from '@/plugins/topic/utils/messageFilters';
import { resolveTopicId } from '@/plugins/topic/utils/topicResolver';

import { FindMessageInputSchema } from './input';

export class FindMessageCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const validParams = FindMessageInputSchema.parse(args.args);
    const currentNetwork = api.network.getCurrentNetwork();
    const topicId = resolveTopicId(
      validParams.topic,
      api.alias,
      currentNetwork,
    );

    const normalisedParams: FindMessageNormalisedParams = {
      ...validParams,
      topicId,
      currentNetwork,
    };

    logger.info(`Finding messages in topic: ${normalisedParams.topicId}`);

    const apiFilters = buildApiFilters(validParams);
    const messages = await fetchFilteredMessages(
      api,
      normalisedParams.topicId,
      apiFilters.length > 0 ? apiFilters : undefined,
    );

    const outputData: FindMessagesOutput = {
      topicId: normalisedParams.topicId,
      messages,
      totalCount: messages.length,
      network: normalisedParams.currentNetwork,
    };

    return { result: outputData };
  }
}

export async function topicFindMessage(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new FindMessageCommand().execute(args);
}

import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { FindMessagesOutput } from './output';

import { fetchFilteredMessages } from '@/plugins/topic/utils/message-helpers';
import { buildApiFilters } from '@/plugins/topic/utils/messageFilters';
import { resolveTopicId } from '@/plugins/topic/utils/topicResolver';

import { FindMessageInputSchema } from './input';

export async function findMessage(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const validParams = FindMessageInputSchema.parse(args.args);

  const topicIdOrAlias = validParams.topic;

  const currentNetwork = api.network.getCurrentNetwork();
  const topicId = resolveTopicId(topicIdOrAlias, api.alias, currentNetwork);

  logger.info(`Finding messages in topic: ${topicId}`);

  const apiFilters = buildApiFilters(validParams);

  const messages = await fetchFilteredMessages(
    api,
    topicId,
    apiFilters.length > 0 ? apiFilters : undefined,
  );

  const outputData: FindMessagesOutput = {
    topicId,
    messages,
    totalCount: messages.length,
    network: currentNetwork,
  };

  return { result: outputData };
}

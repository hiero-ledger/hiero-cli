/**
 * Topic Message Find Command Handler
 * Handles finding messages in topics using mirror node
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { FindMessagesOutput } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { fetchFilteredMessages } from '@/plugins/topic/utils/message-helpers';
import { buildApiFilters } from '@/plugins/topic/utils/messageFilters';
import { resolveTopicId } from '@/plugins/topic/utils/topicResolver';

import { FindMessageInputSchema } from './input';

export async function findMessage(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const validParams = FindMessageInputSchema.parse(args.args);

  const topicIdOrAlias = validParams.topic;

  try {
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
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to find messages', error),
    };
  }
}

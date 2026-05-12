import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { TopicResolutionService } from '@/plugins/topic/services/topic-resolution.service.interface';
import type { TopicFindMessageOutput } from './output';
import type { FindMessageNormalisedParams } from './types';

import { TopicResolutionServiceImpl } from '@/plugins/topic/services/topic-resolution.service';
import { fetchFilteredMessages } from '@/plugins/topic/utils/message-helpers';
import { buildApiFilters } from '@/plugins/topic/utils/messageFilters';

import { TopicFindMessageInputSchema } from './input';

export class TopicFindMessageCommand implements Command {
  constructor(private readonly topicResolution: TopicResolutionService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const validParams = TopicFindMessageInputSchema.parse(args.args);
    const currentNetwork = api.network.getCurrentNetwork();
    const topicId = this.topicResolution.resolveTopicId(
      validParams.topic,
      currentNetwork,
    );

    const normalisedParams: FindMessageNormalisedParams = {
      ...validParams,
      topicId,
      currentNetwork,
    };

    api.logger.info(`Finding messages in topic: ${normalisedParams.topicId}`);

    const apiFilters = buildApiFilters(validParams);
    const messages = await fetchFilteredMessages(
      api,
      normalisedParams.topicId,
      apiFilters.length > 0 ? apiFilters : undefined,
    );

    const outputData: TopicFindMessageOutput = {
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
  const { alias } = args.api;
  const topicResolution = new TopicResolutionServiceImpl(alias);

  return new TopicFindMessageCommand(topicResolution).execute(args);
}

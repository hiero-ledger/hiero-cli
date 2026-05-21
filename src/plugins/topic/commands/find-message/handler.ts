import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { TopicMessageQueryService } from '@/plugins/topic/services/topic-message-query.service.interface';
import type { TopicResolutionService } from '@/plugins/topic/services/topic-resolution.service.interface';
import type { TopicFindMessageOutput } from './output';
import type { FindMessageNormalisedParams } from './types';

import { TopicMessageQueryServiceImpl } from '@/plugins/topic/services/topic-message-query.service';
import { TopicResolutionServiceImpl } from '@/plugins/topic/services/topic-resolution.service';
import { buildApiFilters } from '@/plugins/topic/utils/messageFilters';

import { TopicFindMessageInputSchema } from './input';

export class TopicFindMessageCommand implements Command {
  constructor(
    private readonly topicResolution: TopicResolutionService,
    private readonly topicMessageQuery: TopicMessageQueryService,
  ) {}

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
    const messages = await this.topicMessageQuery.fetchFilteredMessages(
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
  const { alias, mirror } = args.api;
  const topicResolution = new TopicResolutionServiceImpl(alias);
  const topicMessageQuery = new TopicMessageQueryServiceImpl(mirror);

  return new TopicFindMessageCommand(
    topicResolution,
    topicMessageQuery,
  ).execute(args);
}

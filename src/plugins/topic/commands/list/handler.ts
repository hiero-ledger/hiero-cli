import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { TopicListOutput } from './output';
import type { ListTopicsNormalisedParams } from './types';

import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

import { TopicListInputSchema } from './input';

export class TopicListCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const topicState = new ZustandTopicStateHelper(api.state, logger);
    const validArgs = TopicListInputSchema.parse(args.args);
    const normalisedParams: ListTopicsNormalisedParams = {
      networkFilter: validArgs.network,
    };

    logger.info('Listing topics...');

    let topics = topicState.listTopics();

    if (normalisedParams.networkFilter) {
      topics = topics.filter(
        (topic) => topic.network === normalisedParams.networkFilter,
      );
    }

    const stats = {
      withAdminKey: topics.filter(
        (topic) => (topic.adminKeyRefIds?.length ?? 0) > 0,
      ).length,
      withSubmitKey: topics.filter(
        (topic) => (topic.submitKeyRefIds?.length ?? 0) > 0,
      ).length,
      withMemo: topics.filter(
        (topic) => topic.memo && topic.memo !== '(No memo)',
      ).length,
      byNetwork: topics.reduce(
        (acc, topic) => {
          acc[topic.network] = (acc[topic.network] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };

    const topicsOutput = topics.map((topic) => ({
      name: topic.name,
      topicId: topic.topicId,
      network: topic.network,
      memo: topic.memo && topic.memo !== '(No memo)' ? topic.memo : null,
      adminKeyPresent: (topic.adminKeyRefIds?.length ?? 0) > 0,
      submitKeyPresent: (topic.submitKeyRefIds?.length ?? 0) > 0,
      createdAt: topic.createdAt,
    }));

    const outputData: TopicListOutput = {
      topics: topicsOutput,
      totalCount: topics.length,
      stats,
    };

    return { result: outputData };
  }
}

export async function topicList(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TopicListCommand().execute(args);
}

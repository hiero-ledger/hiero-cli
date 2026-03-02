import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ListTopicsOutput } from './output';

import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

import { ListTopicsInputSchema } from './input';

export async function listTopics(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const topicState = new ZustandTopicStateHelper(api.state, logger);
  const validArgs = ListTopicsInputSchema.parse(args.args);

  const networkFilter = validArgs.network;

  logger.info('Listing topics...');

  let topics = topicState.listTopics();

  if (networkFilter) {
    topics = topics.filter((topic) => topic.network === networkFilter);
  }

  const stats = {
    withAdminKey: topics.filter((t) => t.adminKeyRefId).length,
    withSubmitKey: topics.filter((t) => t.submitKeyRefId).length,
    withMemo: topics.filter((t) => t.memo && t.memo !== '(No memo)').length,
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
    adminKeyPresent: Boolean(topic.adminKeyRefId),
    submitKeyPresent: Boolean(topic.submitKeyRefId),
    createdAt: topic.createdAt,
  }));

  const outputData: ListTopicsOutput = {
    topics: topicsOutput,
    totalCount: topics.length,
    stats,
  };

  return { result: outputData };
}

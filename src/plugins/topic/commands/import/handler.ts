import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { TopicData } from '@/plugins/topic/schema';
import type { ImportTopicOutput } from './output';

import { ValidationError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { hederaTimestampToIso } from '@/core/utils/hedera-timestamp';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

import { ImportTopicInputSchema } from './input';

export async function importTopic(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const topicState = new ZustandTopicStateHelper(api.state, logger);

  const validArgs = ImportTopicInputSchema.parse(args.args);

  const topicId = validArgs.topic;
  const alias = validArgs.name;

  const network = api.network.getCurrentNetwork();

  if (alias) {
    api.alias.availableOrThrow(alias, network);
  }

  const topicInfo = await api.mirror.getTopicInfo(topicId);

  const key = composeKey(network, topicId);
  logger.info(`Importing topic: ${key} (${topicId})`);

  if (topicState.loadTopic(key)) {
    throw new ValidationError(
      `Topic with ID '${topicId}' already exists in state`,
    );
  }

  if (alias) {
    api.alias.register({
      alias,
      type: AliasType.Topic,
      network,
      entityId: topicId,
      createdAt: new Date().toISOString(),
    });
  }

  const createdAt = hederaTimestampToIso(topicInfo.created_timestamp);
  const topicData: TopicData = {
    name: alias,
    topicId,
    memo: topicInfo.memo || '(No memo)',
    adminKeyRefId: undefined,
    submitKeyRefId: undefined,
    network,
    createdAt,
  };

  topicState.saveTopic(key, topicData);

  const result: ImportTopicOutput = {
    topicId,
    name: topicData.name,
    network,
    memo: topicInfo.memo || undefined,
    adminKeyPresent: Boolean(topicInfo.admin_key),
    submitKeyPresent: Boolean(topicInfo.submit_key),
  };

  return { result };
}

/**
 * Topic Import Command Handler
 * Handles importing existing topics into state using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { TopicData } from '@/plugins/topic/schema';
import type { ImportTopicOutput } from './output';

import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { hederaTimestampToIso } from '@/core/utils/hedera-timestamp';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

import { ImportTopicInputSchema } from './input';

export async function importTopic(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const topicState = new ZustandTopicStateHelper(api.state, logger);

  const validArgs = ImportTopicInputSchema.parse(args.args);

  const topicId = validArgs.topic;
  const alias = validArgs.name;

  const network = api.network.getCurrentNetwork();

  try {
    if (alias) {
      api.alias.availableOrThrow(alias, network);
    }

    const topicInfo = await api.mirror.getTopicInfo(topicId);

    const name = alias || `imported-${topicId.replace(/\./g, '-')}`;
    logger.info(`Importing topic: ${name} (${topicId})`);

    if (topicState.findTopicByTopicId(topicId)) {
      return {
        status: Status.Failure,
        errorMessage: `Topic with ID '${topicId}' already exists in state`,
      };
    }

    if (alias) {
      api.alias.register({
        alias,
        type: ALIAS_TYPE.Topic,
        network,
        entityId: topicId,
        createdAt: new Date().toISOString(),
      });
    }

    const createdAt = hederaTimestampToIso(topicInfo.created_timestamp);
    const topicData: TopicData = {
      name,
      topicId,
      memo: topicInfo.memo || '(No memo)',
      adminKeyRefId: undefined,
      submitKeyRefId: undefined,
      network,
      createdAt,
    };

    topicState.saveTopic(topicId, topicData);

    const outputData: ImportTopicOutput = {
      topicId,
      name: topicData.name,
      network,
      memo: topicInfo.memo || undefined,
      adminKeyPresent: Boolean(topicInfo.admin_key),
      submitKeyPresent: Boolean(topicInfo.submit_key),
      alias,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to import topic', error),
    };
  }
}

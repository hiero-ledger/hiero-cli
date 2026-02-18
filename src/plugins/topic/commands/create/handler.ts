import type {
  CommandHandlerArgs,
  CommandResult,
  TransactionResult,
} from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { CreateTopicOutput } from './output';

import { PublicKey } from '@hashgraph/sdk';

import { TransactionError } from '@/core/errors';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

import { CreateTopicInputSchema } from './input';

export async function createTopic(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const topicState = new ZustandTopicStateHelper(api.state, logger);
  const validArgs = CreateTopicInputSchema.parse(args.args);

  const memo = validArgs.memo;
  const adminKeyArg = validArgs.adminKey;
  const submitKeyArg = validArgs.submitKey;
  const alias = validArgs.name;
  const keyManagerArg = validArgs.keyManager;

  const network = api.network.getCurrentNetwork();
  api.alias.availableOrThrow(alias, network);

  const keyManager =
    keyManagerArg ||
    api.config.getOption<KeyManagerName>('default_key_manager');
  const name = alias || `topic-${Date.now()}`;

  if (memo) {
    logger.info(`Creating topic with memo: ${memo}`);
  }

  const adminKey =
    adminKeyArg &&
    (await api.keyResolver.getOrInitKey(adminKeyArg, keyManager, [
      'topic:admin',
      `topic:${name}`,
    ]));

  const submitKey =
    submitKeyArg &&
    (await api.keyResolver.getOrInitKey(submitKeyArg, keyManager, [
      'topic:submit',
      `topic:${name}`,
    ]));

  const topicCreateResult = api.topic.createTopic({
    memo,
    adminKey: adminKey && PublicKey.fromString(adminKey.publicKey),
    submitKey: submitKey && PublicKey.fromString(submitKey.publicKey),
  });

  let result: TransactionResult;

  if (adminKey) {
    result = await api.txExecution.signAndExecuteWith(
      topicCreateResult.transaction,
      [adminKey.keyRefId],
    );
  } else {
    result = await api.txExecution.signAndExecute(
      topicCreateResult.transaction,
    );
  }

  if (!result.success) {
    throw new TransactionError('Failed to create topic', false);
  }

  const topicData = {
    name,
    topicId: result.topicId || '(unknown)',
    memo: memo || '(No memo)',
    adminKeyRefId: adminKey?.keyRefId,
    submitKeyRefId: submitKey?.keyRefId,
    network: api.network.getCurrentNetwork(),
    createdAt: result.consensusTimestamp,
    updatedAt: result.consensusTimestamp,
  };

  if (alias) {
    api.alias.register({
      alias,
      type: 'topic',
      network: api.network.getCurrentNetwork(),
      entityId: result.topicId,
      createdAt: result.consensusTimestamp,
    });
  }

  topicState.saveTopic(String(result.topicId), topicData);

  const outputData: CreateTopicOutput = {
    topicId: topicData.topicId,
    name: topicData.name,
    network: topicData.network,
    memo,
    adminKeyPresent: Boolean(topicData.adminKeyRefId),
    submitKeyPresent: Boolean(topicData.submitKeyRefId),
    transactionId: result.transactionId || '',
    createdAt: topicData.createdAt,
  };

  return { result: outputData };
}

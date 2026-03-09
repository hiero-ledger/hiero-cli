import type {
  CommandHandlerArgs,
  CommandResult,
  TransactionResult,
} from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { CreateTopicOutput } from './output';

import { PublicKey } from '@hashgraph/sdk';

import { TransactionError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
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
    keyManagerArg || api.config.getOption<KeyManager>('default_key_manager');

  if (memo) {
    logger.info(`Creating topic with memo: ${memo}`);
  }

  const adminKey =
    adminKeyArg &&
    (await api.keyResolver.resolveSigningKey(adminKeyArg, keyManager, [
      'topic:admin',
    ]));

  const submitKey =
    submitKeyArg &&
    (await api.keyResolver.getPublicKey(submitKeyArg, keyManager, [
      'topic:submit',
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
  if (!result.success || !result.topicId) {
    throw new TransactionError(
      `Failed to create topic (txId: ${result.transactionId})`,
      false,
    );
  }

  const topicData = {
    name: alias,
    topicId: result.topicId || '(unknown)',
    memo: memo || '(No memo)',
    adminKeyRefId: adminKey?.keyRefId,
    submitKeyRefId: submitKey?.keyRefId,
    network: api.network.getCurrentNetwork(),
    createdAt: result.consensusTimestamp,
  };

  if (alias) {
    api.alias.register({
      alias,
      type: AliasType.Topic,
      network: api.network.getCurrentNetwork(),
      entityId: result.topicId,
      createdAt: result.consensusTimestamp,
    });
  }

  const key = composeKey(network, result.topicId);
  // Step 7: Save topic to state
  topicState.saveTopic(key, topicData);

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

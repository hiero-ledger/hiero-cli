import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TopicCreateOutput } from './output';
import type {
  CreateTopicBuildTransactionResult,
  CreateTopicExecuteTransactionResult,
  CreateTopicNormalisedParams,
  CreateTopicSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { TransactionError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { toHederaKey } from '@/plugins/topic/utils/keys-to-hedera-key';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

import { TopicCreateInputSchema } from './input';

export const TOPIC_CREATE_COMMAND_NAME = 'topic_create';

export class TopicCreateCommand extends BaseTransactionCommand<
  CreateTopicNormalisedParams,
  CreateTopicBuildTransactionResult,
  CreateTopicSignTransactionResult,
  CreateTopicExecuteTransactionResult
> {
  constructor() {
    super(TOPIC_CREATE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<CreateTopicNormalisedParams> {
    const { api, logger } = args;
    const validArgs = TopicCreateInputSchema.parse(args.args);

    const memo = validArgs.memo;
    const adminKeyArgs = validArgs.adminKey;
    const submitKeyArgs = validArgs.submitKey;
    const alias = validArgs.name;
    const keyManagerArg = validArgs.keyManager;
    const network = api.network.getCurrentNetwork();

    api.alias.availableOrThrow(alias, network);

    const keyManager =
      keyManagerArg || api.config.getOption<KeyManager>('default_key_manager');

    if (memo) {
      logger.info(`Creating topic with memo: ${memo}`);
    }

    const adminKeys = await Promise.all(
      adminKeyArgs.map((cred) =>
        api.keyResolver.resolveSigningKey(cred, keyManager, false, [
          'topic:admin',
        ]),
      ),
    );

    const submitKeys = await Promise.all(
      submitKeyArgs.map((cred) =>
        api.keyResolver.getPublicKey(cred, keyManager, false, ['topic:submit']),
      ),
    );

    return {
      memo,
      alias,
      keyManager,
      network,
      adminKeys,
      submitKeys,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: CreateTopicNormalisedParams,
  ): Promise<CreateTopicBuildTransactionResult> {
    const { api } = args;

    const adminKey = toHederaKey(normalisedParams.adminKeys);
    const submitKey = toHederaKey(normalisedParams.submitKeys);

    const topicCreateResult = api.topic.createTopic({
      memo: normalisedParams.memo,
      adminKey,
      submitKey,
    });

    return {
      transaction: topicCreateResult.transaction,
    };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: CreateTopicNormalisedParams,
    buildTransactionResult: CreateTopicBuildTransactionResult,
  ): Promise<CreateTopicSignTransactionResult> {
    const { api } = args;

    const adminKeyRefIds =
      normalisedParams.adminKeys.length > 0
        ? [normalisedParams.adminKeys[0].keyRefId]
        : [];

    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      adminKeyRefIds,
    );

    return { signedTransaction: transaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: CreateTopicNormalisedParams,
    _buildTransactionResult: CreateTopicBuildTransactionResult,
    signTransactionResult: CreateTopicSignTransactionResult,
  ): Promise<CreateTopicExecuteTransactionResult> {
    const { api } = args;

    const result = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );
    if (!result.success || !result.topicId) {
      throw new TransactionError(
        `Failed to create topic (txId: ${result.transactionId})`,
        false,
      );
    }

    return result;
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: CreateTopicNormalisedParams,
    _buildTransactionResult: CreateTopicBuildTransactionResult,
    _signTransactionResult: CreateTopicSignTransactionResult,
    executeTransactionResult: CreateTopicExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { api, logger } = args;
    const topicState = new ZustandTopicStateHelper(api.state, logger);
    const topicId = executeTransactionResult.topicId;
    if (!topicId) {
      throw new TransactionError(
        `Failed to create topic (txId: ${executeTransactionResult.transactionId})`,
        false,
      );
    }

    const topicData = {
      name: normalisedParams.alias,
      topicId,
      memo: normalisedParams.memo || '(No memo)',
      adminKeyRefIds: normalisedParams.adminKeys.map((k) => k.keyRefId),
      submitKeyRefIds: normalisedParams.submitKeys.map((k) => k.keyRefId),
      network: normalisedParams.network,
      createdAt: executeTransactionResult.consensusTimestamp,
    };

    if (normalisedParams.alias) {
      api.alias.register({
        alias: normalisedParams.alias,
        type: AliasType.Topic,
        network: normalisedParams.network,
        entityId: topicId,
        createdAt: executeTransactionResult.consensusTimestamp,
      });
    }

    const key = composeKey(normalisedParams.network, topicId);
    topicState.saveTopic(key, topicData);

    const outputData: TopicCreateOutput = {
      topicId: topicData.topicId,
      name: topicData.name,
      network: topicData.network,
      memo: normalisedParams.memo,
      adminKeyPresent: normalisedParams.adminKeys.length > 0,
      submitKeyPresent: normalisedParams.submitKeys.length > 0,
      transactionId: executeTransactionResult.transactionId || '',
      createdAt: topicData.createdAt,
    };

    return { result: outputData };
  }
}

export async function topicCreate(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TopicCreateCommand().execute(args);
}

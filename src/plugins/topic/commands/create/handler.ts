import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { CreateTopicOutput } from './output';
import type {
  CreateTopicBuildTransactionResult,
  CreateTopicExecuteTransactionResult,
  CreateTopicNormalisedParams,
  CreateTopicSignTransactionResult,
} from './types';

import { PublicKey } from '@hashgraph/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import { TransactionError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

import { CreateTopicInputSchema } from './input';

export const TOPIC_CREATE_COMMAND_NAME = 'topic_create';

export class CreateTopicCommand extends BaseTransactionCommand<
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

    return {
      memo,
      alias,
      keyManager,
      network,
      adminKey,
      submitKey,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: CreateTopicNormalisedParams,
  ): Promise<CreateTopicBuildTransactionResult> {
    const { api } = args;

    const topicCreateResult = api.topic.createTopic({
      memo: normalisedParams.memo,
      adminKey:
        normalisedParams.adminKey &&
        PublicKey.fromString(normalisedParams.adminKey.publicKey),
      submitKey:
        normalisedParams.submitKey &&
        PublicKey.fromString(normalisedParams.submitKey.publicKey),
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

    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      normalisedParams.adminKey ? [normalisedParams.adminKey.keyRefId] : [],
    );

    return { transaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: CreateTopicNormalisedParams,
    _buildTransactionResult: CreateTopicBuildTransactionResult,
    signTransactionResult: CreateTopicSignTransactionResult,
  ): Promise<CreateTopicExecuteTransactionResult> {
    const { api } = args;

    const result = await api.txExecute.execute(
      signTransactionResult.transaction,
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
      adminKeyRefId: normalisedParams.adminKey?.keyRefId,
      submitKeyRefId: normalisedParams.submitKey?.keyRefId,
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

    const outputData: CreateTopicOutput = {
      topicId: topicData.topicId,
      name: topicData.name,
      network: topicData.network,
      memo: normalisedParams.memo,
      adminKeyPresent: Boolean(topicData.adminKeyRefId),
      submitKeyPresent: Boolean(topicData.submitKeyRefId),
      transactionId: executeTransactionResult.transactionId || '',
      createdAt: topicData.createdAt,
    };

    return { result: outputData };
  }
}

export async function createTopic(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new CreateTopicCommand().execute(args);
}

import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { SubmitMessageOutput } from './output';
import type {
  SubmitMessageBuildTransactionResult,
  SubmitMessageExecuteTransactionResult,
  SubmitMessageNormalisedParams,
  SubmitMessageSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

import { SubmitMessageInputSchema } from './input';

export const TOPIC_SUBMIT_MESSAGE_COMMAND_NAME = 'topic_submit-message';

export class SubmitMessageCommand extends BaseTransactionCommand<
  SubmitMessageNormalisedParams,
  SubmitMessageBuildTransactionResult,
  SubmitMessageSignTransactionResult,
  SubmitMessageExecuteTransactionResult
> {
  constructor() {
    super(TOPIC_SUBMIT_MESSAGE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<SubmitMessageNormalisedParams> {
    const { api, logger } = args;
    const topicState = new ZustandTopicStateHelper(api.state, logger);
    const validArgs = SubmitMessageInputSchema.parse(args.args);

    const topicIdOrAlias = validArgs.topic;
    const message = validArgs.message;
    const signerArg = validArgs.signer;
    const keyManagerArg = validArgs.keyManager;
    const currentNetwork = api.network.getCurrentNetwork();
    const keyManager =
      keyManagerArg ||
      api.config.getOption<KeyManagerName>('default_key_manager');

    let topicId = topicIdOrAlias;
    const topicAliasResult = api.alias.resolve(
      topicIdOrAlias,
      AliasType.Topic,
      currentNetwork,
    );
    if (topicAliasResult?.entityId) {
      topicId = topicAliasResult.entityId;
    }
    logger.info(`Submitting message to topic: ${topicId}`);

    const key = composeKey(currentNetwork, topicId);
    const topicData = topicState.loadTopic(key);
    if (!topicData) {
      throw new NotFoundError(`Topic not found with ID or alias: ${topicId}`);
    }

    let signerKeyRefId: string | undefined;

    if (signerArg) {
      const resolvedSigner = await api.keyResolver.resolveSigningKey(
        signerArg,
        keyManager,
        ['topic:signer'],
      );
      signerKeyRefId = resolvedSigner.keyRefId;

      if (
        topicData.submitKeyRefId &&
        topicData.submitKeyRefId !== signerKeyRefId
      ) {
        throw new ValidationError(
          'The provided signer is not authorized to submit messages to this topic. The topic has a different submit key configured.',
        );
      }

      if (topicData.submitKeyRefId) {
        logger.info(`Using provided signer (authorized submit key)`);
      } else {
        logger.info(`Using provided signer for public topic`);
      }
    }

    return {
      topicId,
      message,
      signerKeyRefId,
      keyManager,
      currentNetwork,
      topicData,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: SubmitMessageNormalisedParams,
  ): Promise<SubmitMessageBuildTransactionResult> {
    const { api } = args;

    const messageSubmitTx = api.topic.submitMessage({
      topicId: normalisedParams.topicId,
      message: normalisedParams.message,
    });

    return {
      transaction: messageSubmitTx.transaction,
    };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: SubmitMessageNormalisedParams,
    buildTransactionResult: SubmitMessageBuildTransactionResult,
  ): Promise<SubmitMessageSignTransactionResult> {
    const { api } = args;

    const transaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      normalisedParams.signerKeyRefId ? [normalisedParams.signerKeyRefId] : [],
    );

    return { transaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: SubmitMessageNormalisedParams,
    _buildTransactionResult: SubmitMessageBuildTransactionResult,
    signTransactionResult: SubmitMessageSignTransactionResult,
  ): Promise<SubmitMessageExecuteTransactionResult> {
    const { api } = args;

    const txResult = await api.txExecute.execute(
      signTransactionResult.transaction,
    );
    if (!txResult.success) {
      throw new TransactionError(
        `Failed to submit message (topicId: ${normalisedParams.topicId}, txId: ${txResult.transactionId})`,
        false,
      );
    }

    return txResult;
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: SubmitMessageNormalisedParams,
    _buildTransactionResult: SubmitMessageBuildTransactionResult,
    _signTransactionResult: SubmitMessageSignTransactionResult,
    executeTransactionResult: SubmitMessageExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: SubmitMessageOutput = {
      topicId: normalisedParams.topicId,
      message: normalisedParams.message,
      sequenceNumber: executeTransactionResult.topicSequenceNumber ?? 0,
      transactionId: executeTransactionResult.transactionId || '',
      submittedAt: new Date().toISOString(),
      network: normalisedParams.currentNetwork,
    };

    return { result: outputData };
  }
}

const submitMessageCommand = new SubmitMessageCommand();

export const submitMessage =
  submitMessageCommand.execute.bind(submitMessageCommand);

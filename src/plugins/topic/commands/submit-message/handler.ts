import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TopicSubmitMessageOutput } from './output';
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

import { TopicSubmitMessageInputSchema } from './input';

export const TOPIC_SUBMIT_MESSAGE_COMMAND_NAME = 'topic_submit-message';

export class TopicSubmitMessageCommand extends BaseTransactionCommand<
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
    const validArgs = TopicSubmitMessageInputSchema.parse(args.args);

    const topicIdOrAlias = validArgs.topic;
    const message = validArgs.message;
    const signerArgs = validArgs.signer;
    const keyManagerArg = validArgs.keyManager;
    const currentNetwork = api.network.getCurrentNetwork();
    const keyManager =
      keyManagerArg || api.config.getOption<KeyManager>('default_key_manager');

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

    const signerKeyRefIds: string[] = [];
    const allowedSubmitKeyRefIds = topicData.submitKeyRefIds ?? [];
    const submitKeyThreshold = topicData.submitKeyThreshold ?? 0;

    for (const signerArg of signerArgs) {
      const resolvedSigner = await api.keyResolver.resolveSigningKey(
        signerArg,
        keyManager,
        false,
        ['topic:signer'],
      );
      if (
        allowedSubmitKeyRefIds.length > 0 &&
        !allowedSubmitKeyRefIds.includes(resolvedSigner.keyRefId)
      ) {
        logger.warn(
          `Signer ${resolvedSigner.keyRefId} is not in the topic's submit keys and was ignored`,
        );
        continue;
      }
      signerKeyRefIds.push(resolvedSigner.keyRefId);
    }

    if (signerKeyRefIds.length < submitKeyThreshold) {
      throw new ValidationError(
        `Topic requires ${submitKeyThreshold} signature(s) for submit key (threshold ${submitKeyThreshold}-of-${allowedSubmitKeyRefIds.length}). Provided ${signerKeyRefIds.length} signer(s).`,
      );
    }

    if (allowedSubmitKeyRefIds.length > 0) {
      logger.info(
        `Using ${signerKeyRefIds.length} signer(s) (authorized submit key)`,
      );
    } else {
      logger.info(`Using provided signer for public topic`);
    }

    return {
      topicId,
      message,
      signerKeyRefIds,
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
      normalisedParams.signerKeyRefIds,
    );

    return { signedTransaction: transaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: SubmitMessageNormalisedParams,
    _buildTransactionResult: SubmitMessageBuildTransactionResult,
    signTransactionResult: SubmitMessageSignTransactionResult,
  ): Promise<SubmitMessageExecuteTransactionResult> {
    const { api } = args;

    const txResult = await api.txExecute.execute(
      signTransactionResult.signedTransaction,
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
    const outputData: TopicSubmitMessageOutput = {
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

export async function topicSubmitMessage(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TopicSubmitMessageCommand().execute(args);
}

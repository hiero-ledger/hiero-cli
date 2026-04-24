import type { CommandHandlerArgs, CommandResult } from '@/core';
import type {
  Credential,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';
import type { TopicInfo } from '@/core/services/mirrornode/types';
import type { TopicSubmitMessageOutput } from './output';
import type {
  SubmitMessageBuildTransactionResult,
  SubmitMessageExecuteTransactionResult,
  SubmitMessageNormalisedParams,
  SubmitMessageSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { TransactionError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { AliasType } from '@/core/types/shared.types';

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

  private async resolveSubmitSigners(
    args: CommandHandlerArgs,
    topicInfo: TopicInfo,
    signerArgs: Credential[],
    keyManager: KeyManager,
    topicId: string,
  ): Promise<string[]> {
    const { api, logger } = args;

    if (topicInfo.submit_key) {
      const { keyRefIds } =
        await api.keyResolver.resolveSigningKeyRefIdsFromMirrorRoleKey({
          mirrorRoleKey: topicInfo.submit_key,
          explicitCredentials: signerArgs,
          keyManager,
          resolveSigningKeyLabels: ['topic:submit'],
          emptyMirrorRoleKeyMessage: 'Topic has no submit key on the network',
          insufficientKmsMatchesMessage:
            'Not enough submit key(s) found in key manager for this topic. Provide --signer.',
          validationErrorOptions: { context: { topicId } },
        });
      logger.info(`Using ${keyRefIds.length} signer(s) for submit key`);
      return keyRefIds;
    }

    if (signerArgs.length > 0) {
      const resolved = await Promise.all(
        signerArgs.map((s) =>
          api.keyResolver.resolveSigningKey(s, keyManager, false, [
            'topic:submit',
          ]),
        ),
      );
      logger.info(`Using provided signer for public topic`);
      return resolved.map((s) => s.keyRefId);
    }

    logger.info(`Submitting to public topic (no submit key required)`);
    return [];
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<SubmitMessageNormalisedParams> {
    const { api, logger } = args;
    const validArgs = TopicSubmitMessageInputSchema.parse(args.args);

    const topicIdOrAlias = validArgs.topic;
    const message = validArgs.message;
    const signerArgs = validArgs.signer;
    const keyManagerArg = validArgs.keyManager;
    const currentNetwork = api.network.getCurrentNetwork();
    const keyManager =
      keyManagerArg ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

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

    const topicInfo = await api.mirror.getTopicInfo(topicId);
    const signerKeyRefIds = await this.resolveSubmitSigners(
      args,
      topicInfo,
      signerArgs,
      keyManager,
      topicId,
    );

    return {
      topicId,
      message,
      signerKeyRefIds,
      keyManager,
      currentNetwork,
      keyRefIds: signerKeyRefIds,
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

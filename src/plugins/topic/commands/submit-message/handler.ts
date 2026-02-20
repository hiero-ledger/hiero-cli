import type {
  CommandHandlerArgs,
  CommandResult,
  TransactionResult,
} from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { SubmitMessageOutput } from './output';

import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

import { SubmitMessageInputSchema } from './input';

export async function submitMessage(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
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
    'topic',
    currentNetwork,
  );
  if (topicAliasResult?.entityId) {
    topicId = topicAliasResult.entityId;
  }

  logger.info(`Submitting message to topic: ${topicId}`);

  const topicData = topicState.loadTopic(topicId);
  if (!topicData) {
    throw new NotFoundError(`Topic not found with ID or alias: ${topicId}`);
  }

  let signerKeyRefId: string | undefined;

  if (signerArg) {
    const resolvedSigner = await api.keyResolver.getOrInitKey(
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

  const messageSubmitTx = api.topic.submitMessage({ topicId, message });

  const txResult: TransactionResult = signerKeyRefId
    ? await api.txExecution.signAndExecuteWith(messageSubmitTx.transaction, [
        signerKeyRefId,
      ])
    : await api.txExecution.signAndExecute(messageSubmitTx.transaction);

  if (!txResult.success) {
    throw new TransactionError('Failed to submit message', false);
  }

  const outputData: SubmitMessageOutput = {
    topicId,
    message,
    sequenceNumber: txResult.topicSequenceNumber ?? 0,
    transactionId: txResult.transactionId || '',
    submittedAt: new Date().toISOString(),
    network: currentNetwork,
  };

  return { result: outputData };
}

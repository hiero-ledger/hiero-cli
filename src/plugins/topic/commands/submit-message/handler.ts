/**
 * Topic Message Submit Command Handler
 * Handles submitting messages to topics
 */
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { SubmitMessageOutput } from './output';

import {
  type CommandExecutionResult,
  type CommandHandlerArgs,
  type TransactionResult,
} from '@/core';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

import { SubmitMessageInputSchema } from './input';

/**
 * Default export handler function for message submission
 * @param args - Command handler arguments from CLI core
 * @returns Promise resolving to CommandExecutionResult with structured output
 */
export async function submitMessage(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Initialize Zustand state helper for topic state management
  const topicState = new ZustandTopicStateHelper(api.state, logger);

  // Parse and validate command arguments
  const validArgs = SubmitMessageInputSchema.parse(args.args);

  const topicIdOrAlias = validArgs.topic;
  const message = validArgs.message;
  const signerArg = validArgs.signer;
  const keyManagerArg = validArgs.keyManager;

  const currentNetwork = api.network.getCurrentNetwork();

  // Get keyManager from args or fallback to config
  const keyManager =
    keyManagerArg ||
    api.config.getOption<KeyManagerName>('default_key_manager');

  // Step 1: Resolve topic ID from alias if it exists
  let topicId = topicIdOrAlias;
  const topicAliasResult = api.alias.resolve(
    topicIdOrAlias,
    'topic',
    currentNetwork,
  );

  if (topicAliasResult?.entityId) {
    topicId = topicAliasResult.entityId;
  }

  // Log progress indicator (not final output)
  logger.info(`Submitting message to topic: ${topicId}`);

  try {
    // Step 2: Load topic data from state
    const topicData = topicState.loadTopic(topicId);

    if (!topicData) {
      return {
        status: Status.Failure,
        errorMessage: `Topic not found with ID or alias: ${topicId}`,
      };
    }

    // Resolve signer if provided
    let signerKeyRefId: string | undefined;

    if (signerArg) {
      const resolvedSigner = await api.keyResolver.getOrInitKey(
        signerArg,
        keyManager,
        ['topic:signer'],
      );
      signerKeyRefId = resolvedSigner.keyRefId;

      // Validate: if topic has submit key, the signer must match it
      if (topicData.submitKeyRefId) {
        if (topicData.submitKeyRefId !== signerKeyRefId) {
          return {
            status: Status.Failure,
            errorMessage: `The provided signer is not authorized to submit messages to this topic. The topic has a different submit key configured.`,
          };
        }
        logger.info(`Using provided signer (authorized submit key)`);
      } else {
        logger.info(`Using provided signer for public topic`);
      }
    }

    // Step 3: Create message submit transaction using Core API
    const messageSubmitTx = api.topic.submitMessage({
      topicId,
      message,
    });

    // Step 4: Sign and execute transaction
    const txResult: TransactionResult = signerKeyRefId
      ? await api.txExecution.signAndExecuteWith(messageSubmitTx.transaction, [
          signerKeyRefId,
        ])
      : await api.txExecution.signAndExecute(messageSubmitTx.transaction);

    if (txResult.success) {
      // Step 5: Prepare structured output data
      const outputData: SubmitMessageOutput = {
        topicId,
        message,
        sequenceNumber: txResult.topicSequenceNumber ?? 0,
        transactionId: txResult.transactionId || '',
        submittedAt: new Date().toISOString(),
      };

      // Return success result with JSON output
      return {
        status: Status.Success,
        outputJson: JSON.stringify(outputData),
      };
    } else {
      // Transaction execution failed
      return {
        status: Status.Failure,
        errorMessage: 'Failed to submit message',
      };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('INVALID_SIGNATURE')) {
      return {
        status: Status.Failure,
        errorMessage: `This topic requires a specific submit key to send messages. Use --signer (-s) option to specify the authorized account.`,
      };
    }

    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to submit message', error),
    };
  }
}

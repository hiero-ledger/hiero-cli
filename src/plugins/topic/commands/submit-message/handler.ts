/**
 * Topic Message Submit Command Handler
 * Handles submitting messages to topics
 */
import { CommandHandlerArgs } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { Status } from '../../../../core/shared/constants';
import type { TransactionResult } from '../../../../core';
import { formatError } from '../../../../utils/errors';
import { ZustandTopicStateHelper } from '../../zustand-state-helper';
import { SubmitMessageOutput } from './output';

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

  // Extract and validate command arguments
  const topicIdOrAlias = args.args.topicId as string;
  const message = args.args.message as string;

  const currentNetwork = api.network.getCurrentNetwork();

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
  logger.log(`Submitting message to topic: ${topicId}`);

  try {
    // Step 2: Load topic data from state
    const topicData = topicState.loadTopic(topicId);

    if (!topicData) {
      return {
        status: Status.Failure,
        errorMessage: `Topic not found with ID or alias: ${topicId}`,
      };
    }

    // Step 3: Create message submit transaction using Core API
    const messageSubmitTx = api.topic.submitMessage({
      topicId,
      message,
    });

    let txResult: TransactionResult;

    // Step 4: Sign and execute transaction (with submit key if available)
    if (topicData.submitKeyRefId) {
      txResult = await api.txExecution.signAndExecuteWith(
        messageSubmitTx.transaction,
        {
          keyRefId: topicData.submitKeyRefId,
        },
      );
    } else {
      txResult = await api.txExecution.signAndExecute(
        messageSubmitTx.transaction,
      );
    }

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
    // Catch and format any errors
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to submit message', error),
    };
  }
}

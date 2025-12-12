/**
 * Topic Message Find Command Handler
 * Handles finding messages in topics using mirror node
 */
import { CommandExecutionResult, CommandHandlerArgs } from '../../../../core';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../core/utils/errors';
import { Filter } from '../../../../core/services/mirrornode/types';
import { FindMessageOutput, FindMessagesOutput } from './output';
import { FindMessageInputSchema } from './input';
import { resolveTopicId } from '../../utils/topicResolver';
import { buildApiFilters } from '../../utils/messageFilters';

/**
 * Helper function to decode message and format timestamp
 * @param message - Base64 encoded message
 * @param consensusTimestamp - Hedera consensus timestamp
 * @returns Object with decoded message and formatted timestamp
 */
function decodeMessageData(message: string, consensusTimestamp: string) {
  const decodedMessage = Buffer.from(message, 'base64').toString('ascii');

  // Extract seconds from consensus timestamp and convert to milliseconds
  const timestampAsSeconds = consensusTimestamp.split('.')[0];
  const formattedTimestamp = Number(timestampAsSeconds) * 1000;
  const timestamp = new Date(formattedTimestamp).toLocaleString();

  return { decodedMessage, timestamp };
}

/**
 * Transform a single message API response to output format
 * @param message - Raw message from mirror node API
 * @returns Formatted message object with decoded content
 */
function transformMessageToOutput(message: {
  sequence_number: number;
  message: string;
  consensus_timestamp: string;
}) {
  const { decodedMessage, timestamp } = decodeMessageData(
    message.message,
    message.consensus_timestamp,
  );

  return {
    sequenceNumber: message.sequence_number,
    message: decodedMessage,
    timestamp,
    consensusTimestamp: message.consensus_timestamp,
  };
}

/**
 * Fetch multiple messages using filters
 * @param api - API instance
 * @param topicId - The topic ID to query
 * @param filters - Array of filter criteria for sequence numbers
 * @returns Array of formatted messages in reverse order
 */
async function fetchFilteredMessages(
  api: CommandHandlerArgs['api'],
  topicId: string,
  filters: Filter[] | undefined,
): Promise<FindMessageOutput[]> {
  const response = await api.mirror.getTopicMessages({
    topicId,
    filters,
  });

  return response.messages.map(transformMessageToOutput).reverse();
}

/**
 * Default export handler function for finding messages
 * @param args - Command handler arguments from CLI core
 * @returns Promise resolving to CommandExecutionResult with structured output
 */
export async function findMessage(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Parse and validate command arguments
  const validParams = FindMessageInputSchema.parse(args.args);

  const topicIdOrAlias = validParams.topic;

  try {
    const currentNetwork = api.network.getCurrentNetwork();

    // Step 1: Resolve topic ID from alias if it exists
    const topicId = resolveTopicId(topicIdOrAlias, api.alias, currentNetwork);

    // Log progress indicator (not final output)
    logger.info(`Finding messages in topic: ${topicId}`);

    // Build all filters for API query (Mirror Node API supports multiple filters)
    const apiFilters = buildApiFilters(validParams);

    // Fetch messages using all filters
    const messages: FindMessageOutput[] = await fetchFilteredMessages(
      api,
      topicId,
      apiFilters.length > 0 ? apiFilters : undefined,
    );

    // Step 2: Prepare structured output data
    const outputData: FindMessagesOutput = {
      topicId,
      messages,
      totalCount: messages.length,
    };

    // Return success result with JSON output
    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to find messages', error),
    };
  }
}

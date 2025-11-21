/**
 * Topic Message Find Command Handler
 * Handles finding messages in topics using mirror node
 */
import { CommandExecutionResult, CommandHandlerArgs } from '../../../../core';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../core/utils/errors';
import { Filter } from '../../../../core/services/mirrornode/types';
import { FindMessagesOutput } from './output';

/**
 * Helper function to build sequence number filter from command arguments
 * @param args - Command arguments containing filter parameters
 * @returns Filter object or undefined if no filter parameters provided
 */
function buildSequenceNumberFilter(
  args: CommandHandlerArgs['args'],
): Filter | undefined {
  const sequenceFilters = [
    {
      operation: 'gt',
      value: args.sequenceGt,
    },
    {
      operation: 'gte',
      value: args.sequenceGte,
    },
    {
      operation: 'lt',
      value: args.sequenceLt,
    },
    {
      operation: 'lte',
      value: args.sequenceLte,
    },
    {
      operation: 'eq',
      value: args.sequenceEq,
    },
  ];

  // Find first non-empty filter
  const nonEmptyFilters = sequenceFilters.filter(
    (f) => f.value !== undefined,
  ) as Filter[];

  return nonEmptyFilters.length > 0 ? nonEmptyFilters[0] : undefined;
}

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
 * Fetch a single message by sequence number
 * @param api - API instance
 * @param topicId - The topic ID to query
 * @param sequenceNumber - Specific sequence number to fetch
 * @returns Array containing single formatted message
 */
async function fetchSingleMessage(
  api: CommandHandlerArgs['api'],
  topicId: string,
  sequenceNumber: number,
): Promise<FindMessagesOutput['messages']> {
  const response = await api.mirror.getTopicMessage({
    topicId,
    sequenceNumber,
  });

  return [transformMessageToOutput(response)];
}

/**
 * Fetch multiple messages using a filter
 * @param api - API instance
 * @param topicId - The topic ID to query
 * @param filter - Filter criteria for sequence numbers
 * @returns Array of formatted messages in reverse order
 */
async function fetchFilteredMessages(
  api: CommandHandlerArgs['api'],
  topicId: string,
  filter: Filter,
): Promise<FindMessagesOutput['messages']> {
  const response = await api.mirror.getTopicMessages({
    topicId,
    filter: {
      field: 'sequenceNumber',
      operation: filter.operation,
      value: filter.value,
    },
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

  // Extract command arguments
  const topicIdOrAlias = args.args.topic as string;
  const sequence = args.args.sequence as number | undefined;

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
  logger.log(`Finding messages in topic: ${topicId}`);

  if (sequence !== undefined && sequence <= 0) {
    return {
      status: Status.Failure,
      errorMessage:
        'Sequence number starts from 1. Please provide a valid sequence number.',
    };
  }

  try {
    let messages: FindMessagesOutput['messages'];

    // Step 2: Query messages based on provided parameters
    if (sequence) {
      // Fetch single message by sequence number
      messages = await fetchSingleMessage(api, topicId, sequence);
    } else {
      // Try to build filter from other sequence number parameters
      const filter = buildSequenceNumberFilter(args.args);

      if (!filter) {
        // No sequence number or filter provided - early return
        return {
          status: Status.Failure,
          errorMessage:
            'No sequence number or filter provided. Use --sequence or filter options (--sequence-gt, --sequence-gte, etc.)',
        };
      }

      // Fetch multiple messages with filter
      messages = await fetchFilteredMessages(api, topicId, filter);
    }

    // Step 3: Prepare structured output data
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
    // Catch and format any errors
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to find messages', error),
    };
  }
}

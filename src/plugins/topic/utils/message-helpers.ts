/**
 * Message Helpers
 * Utility functions for processing topic messages
 */
import type { CoreApi } from '../../../core';
import { Filter } from '../../../core/services/mirrornode/types';
import { FindMessageOutput } from '../commands/find-message/output';

export function decodeMessageData(message: string, consensusTimestamp: string) {
  const decodedMessage = Buffer.from(message, 'base64').toString('ascii');

  const timestampAsSeconds = consensusTimestamp.split('.')[0];
  const formattedTimestamp = Number(timestampAsSeconds) * 1000;
  const timestamp = new Date(formattedTimestamp).toLocaleString();

  return { decodedMessage, timestamp };
}

export function transformMessageToOutput(message: {
  sequence_number: number;
  message: string;
  consensus_timestamp: string;
}): FindMessageOutput {
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

export async function fetchFilteredMessages(
  api: CoreApi,
  topicId: string,
  filters: Filter[] | undefined,
): Promise<FindMessageOutput[]> {
  const response = await api.mirror.getTopicMessages({
    topicId,
    filters,
  });

  return response.messages.map(transformMessageToOutput).reverse();
}

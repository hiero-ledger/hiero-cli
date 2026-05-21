import type { TopicFindMessageItemOutput } from '@/plugins/topic/commands/find-message/output';

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
}): TopicFindMessageItemOutput {
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

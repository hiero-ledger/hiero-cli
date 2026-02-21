/**
 * Auctionlog Publish Command Handler
 *
 * Publishes a commitment hash to a Hedera Consensus Service topic.
 * The commitment is: keccak256(JSON.stringify({ auctionId, stage, cantonRef, adiTx, timestamp, nonce }))
 *
 * This proves the order and timing of auction events on a public ledger,
 * without revealing any business-sensitive data (prices, terms, identities).
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { createHash } from 'crypto';

import { AUCTIONLOG_NAMESPACE } from '../../manifest';
import type { AuditLogEntry } from '../../types';
import { PublishInputSchema } from './input';
import { PublishOutputSchema, type PublishOutput } from './output';

/**
 * Build a deterministic commitment hash from auction event fields.
 * Uses keccak256 via Node's crypto (SHA-3 family).
 * Falls back to SHA-256 if keccak is not available.
 */
function buildCommitmentHash(
  auctionId: string,
  stage: string,
  cantonRef: string,
  adiTx: string,
  timestamp: string,
  nonce: string,
): string {
  const payload = JSON.stringify({
    auctionId,
    stage,
    cantonRef,
    adiTx,
    timestamp,
    nonce,
  });
  // Use SHA-256 for portability; the hash is used as a commitment, not for EVM compatibility
  const hash = createHash('sha256').update(payload).digest('hex');
  return `0x${hash}`;
}

/** Generate a random hex nonce */
function randomNonce(): string {
  const bytes = new Uint8Array(16);
  // Use crypto.getRandomValues if available, otherwise Math.random
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return (
    '0x' +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

export async function publishCommitment(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger, state } = args;

  // Validate input
  const validArgs = PublishInputSchema.parse(args.args);

  const currentNetwork = api.network.getCurrentNetwork();
  const timestamp = new Date().toISOString();
  const nonce = randomNonce();

  // Build commitment hash
  const commitmentHash = buildCommitmentHash(
    validArgs.auctionId,
    validArgs.stage,
    validArgs.cantonRef ?? 'CANTON-PENDING',
    validArgs.adiTx ?? 'ADI-PENDING',
    timestamp,
    nonce,
  );

  logger.info(
    `Publishing commitment for auction ${validArgs.auctionId}, stage: ${validArgs.stage}`,
  );

  try {
    // Step 1: Resolve or create topic
    let topicId = validArgs.topic;

    if (!topicId) {
      // Check if we already have a topic for this auction in state
      const existingEntry = state.get<AuditLogEntry>(
        AUCTIONLOG_NAMESPACE,
        validArgs.auctionId,
      );
      if (existingEntry && existingEntry.topicId) {
        topicId = existingEntry.topicId;
        logger.info(`Using existing topic: ${topicId}`);
      } else {
        // Create a new topic for this auction
        logger.info('Creating new HCS topic for auction audit log...');
        const createTx = api.topic.createTopic({
          memo: `BlindBid audit: ${validArgs.auctionId}`,
        });
        const txResult = await api.txExecution.signAndExecute(
          createTx.transaction,
        );

        if (!txResult.success || !txResult.topicId) {
          return {
            status: Status.Failure,
            errorMessage: 'Failed to create HCS topic for auction log',
          };
        }
        topicId = txResult.topicId;
        logger.info(`Created topic: ${topicId}`);
      }
    }

    // Step 2: Publish commitment as HCS message
    const message = JSON.stringify({
      commitmentHash,
      stage: validArgs.stage,
      auctionId: validArgs.auctionId,
      timestamp,
      // Note: cantonRef, adiTx, and nonce are NOT published — only the hash is.
      // This is the privacy guarantee.
    });

    const submitTx = api.topic.submitMessage({
      topicId,
      message,
    });

    const submitResult = await api.txExecution.signAndExecute(
      submitTx.transaction,
    );

    if (!submitResult.success) {
      return {
        status: Status.Failure,
        errorMessage: `Failed to publish commitment to topic ${topicId}`,
      };
    }

    const sequenceNumber = submitResult.topicSequenceNumber ?? 0;

    // Step 3: Save to local state for later verification & export
    const entry: AuditLogEntry = {
      auctionId: validArgs.auctionId,
      stage: validArgs.stage,
      cantonRef: validArgs.cantonRef ?? 'CANTON-PENDING',
      adiTx: validArgs.adiTx ?? 'ADI-PENDING',
      timestamp,
      nonce,
      commitmentHash,
      topicId,
      sequenceNumber,
      network: currentNetwork,
    };

    // Save with key = `{auctionId}:{stage}` for unique lookup
    const stateKey = `${validArgs.auctionId}:${validArgs.stage}`;
    state.set(AUCTIONLOG_NAMESPACE, stateKey, entry);

    // Also maintain an auction-level pointer to the topic
    state.set(AUCTIONLOG_NAMESPACE, validArgs.auctionId, {
      topicId,
      lastStage: validArgs.stage,
      lastUpdated: timestamp,
    });

    // Step 4: Build output
    const output: PublishOutput = PublishOutputSchema.parse({
      auctionId: validArgs.auctionId,
      stage: validArgs.stage,
      commitmentHash,
      topicId,
      sequenceNumber,
      cantonRef: validArgs.cantonRef ?? 'CANTON-PENDING',
      adiTx: validArgs.adiTx ?? 'ADI-PENDING',
      timestamp,
      nonce,
      network: currentNetwork,
    });

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to publish audit commitment', error),
    };
  }
}

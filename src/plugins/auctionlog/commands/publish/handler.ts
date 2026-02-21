/**
 * Auctionlog Publish Command Handler
 *
 * Publishes a commitment hash to a Hedera Consensus Service topic.
 * The commitment is: SHA-256(JSON.stringify({ auctionId, stage, metadata, timestamp, nonce }))
 *
 * This proves the order and timing of auction events on a public ledger,
 * without revealing any business-sensitive data (prices, terms, identities).
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { createHash, randomBytes } from 'crypto';

import { AUCTIONLOG_NAMESPACE } from '../../manifest';
import type { AuditLogEntry, AuctionMeta, AuctionStage } from '../../types';
import { STAGE_ORDER, VALID_STAGES } from '../../types';
import { PublishInputSchema } from './input';
import { PublishOutputSchema, type PublishOutput } from './output';

/**
 * Build a deterministic commitment hash from auction event fields.
 * Uses SHA-256 for maximum portability across runtimes and platforms.
 *
 * The payload is a canonical JSON string of all commitment fields.
 * The nonce ensures each publication is unique even for repeated stages.
 */
export function buildCommitmentHash(
  auctionId: string,
  stage: string,
  metadata: string,
  timestamp: string,
  nonce: string,
): string {
  const payload = JSON.stringify({
    auctionId,
    stage,
    metadata,
    timestamp,
    nonce,
  });
  const hash = createHash('sha256').update(payload).digest('hex');
  return `0x${hash}`;
}

/**
 * Generate a cryptographically secure random hex nonce (16 bytes / 128 bits).
 * Uses Node.js crypto.randomBytes — NOT Math.random().
 */
function secureNonce(): string {
  return `0x${randomBytes(16).toString('hex')}`;
}

/**
 * Validate that the requested stage is allowed given the auction's current state.
 * - 'disputed' can be published at any time after 'created'
 * - All other stages must follow chronological order
 * - Duplicate stage publications are rejected
 */
function validateStageProgression(
  requestedStage: AuctionStage,
  auctionId: string,
  state: CommandHandlerArgs['state'],
): string | null {
  // Check for duplicate stage
  const stateKey = `${auctionId}:${requestedStage}`;
  const existing = state.get<AuditLogEntry>(AUCTIONLOG_NAMESPACE, stateKey);
  if (existing) {
    return `Stage '${requestedStage}' has already been published for auction ${auctionId}. Each stage can only be published once.`;
  }

  // 'created' is always valid as the first stage
  if (requestedStage === 'created') {
    return null;
  }

  // 'disputed' can occur at any time (after auction exists)
  if (requestedStage === 'disputed') {
    const meta = state.get<AuctionMeta>(AUCTIONLOG_NAMESPACE, auctionId);
    if (!meta) {
      return `Cannot publish 'disputed' for auction ${auctionId}: auction has no published stages. Publish 'created' first.`;
    }
    return null;
  }

  // For all other stages, check that the previous stage in the sequence exists
  const requestedOrder = STAGE_ORDER[requestedStage];
  const previousStages = VALID_STAGES.filter(
    (s) => STAGE_ORDER[s] < requestedOrder && s !== 'disputed',
  );

  if (previousStages.length > 0) {
    const immediatePrevious = previousStages[previousStages.length - 1];
    const prevKey = `${auctionId}:${immediatePrevious}`;
    const prevEntry = state.get<AuditLogEntry>(AUCTIONLOG_NAMESPACE, prevKey);
    if (!prevEntry) {
      return `Cannot publish '${requestedStage}' for auction ${auctionId}: stage '${immediatePrevious}' has not been published yet. Stages must follow chronological order.`;
    }
  }

  return null;
}

export async function publishCommitment(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger, state } = args;

  // Validate input
  const validArgs = PublishInputSchema.parse(args.args);

  // Validate stage progression
  const progressionError = validateStageProgression(
    validArgs.stage,
    validArgs.auctionId,
    state,
  );
  if (progressionError) {
    return {
      status: Status.Failure,
      errorMessage: progressionError,
    };
  }

  const currentNetwork = api.network.getCurrentNetwork();
  const timestamp = new Date().toISOString();
  const nonce = secureNonce();
  const metadata = validArgs.metadata ?? '';

  // Build commitment hash
  const commitmentHash = buildCommitmentHash(
    validArgs.auctionId,
    validArgs.stage,
    metadata,
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
      const existingMeta = state.get<AuctionMeta>(
        AUCTIONLOG_NAMESPACE,
        validArgs.auctionId,
      );
      if (existingMeta && existingMeta.topicId) {
        topicId = existingMeta.topicId;
        logger.info(`Using existing topic: ${topicId}`);
      } else {
        // Create a new topic for this auction
        logger.info('Creating new HCS topic for auction audit log...');
        const createTx = api.topic.createTopic({
          memo: `auctionlog: ${validArgs.auctionId}`,
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
    // Only the hash and non-sensitive identifiers are published.
    // metadata and nonce are NOT included — this is the privacy guarantee.
    const message = JSON.stringify({
      version: 1,
      auctionId: validArgs.auctionId,
      stage: validArgs.stage,
      commitmentHash,
      timestamp,
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
      metadata,
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
    const auctionMeta: AuctionMeta = {
      topicId,
      lastStage: validArgs.stage,
      lastUpdated: timestamp,
    };
    state.set(AUCTIONLOG_NAMESPACE, validArgs.auctionId, auctionMeta);

    // Step 4: Build output
    const output: PublishOutput = PublishOutputSchema.parse({
      auctionId: validArgs.auctionId,
      stage: validArgs.stage,
      commitmentHash,
      topicId,
      sequenceNumber,
      metadata,
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

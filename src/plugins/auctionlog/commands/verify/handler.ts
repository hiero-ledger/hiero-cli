/**
 * Auctionlog Verify Command Handler
 *
 * Performs two-layer verification of auction audit commitments:
 *
 * Layer 1 — Local integrity check:
 *   Re-computes the commitment hash from stored fields and compares
 *   against the locally stored hash.
 *
 * Layer 2 — On-chain verification (when --on-chain flag is set):
 *   Fetches the actual HCS topic messages from the Hedera mirror node
 *   and verifies that the commitment hash published on-chain matches
 *   the locally stored hash. This proves the local data hasn't been
 *   altered since publication.
 *
 * Together, these two layers provide a full tamper-evidence guarantee:
 *   - Layer 1 proves internal consistency (hash matches preimage)
 *   - Layer 2 proves the hash was actually published to HCS
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { createHash } from 'crypto';

import { AUCTIONLOG_NAMESPACE } from '../../manifest';
import type { AuditLogEntry, AuctionMeta, AuctionStage } from '../../types';
import { VALID_STAGES } from '../../types';
import { VerifyInputSchema } from './input';
import { VerifyOutputSchema, type VerifyOutput } from './output';

/**
 * Recompute the SHA-256 commitment hash from an audit log entry's fields.
 * This must use the exact same canonical JSON format as buildCommitmentHash
 * in the publish handler.
 */
function recomputeHash(entry: AuditLogEntry): string {
  const payload = JSON.stringify({
    auctionId: entry.auctionId,
    stage: entry.stage,
    metadata: entry.metadata,
    timestamp: entry.timestamp,
    nonce: entry.nonce,
  });
  return `0x${createHash('sha256').update(payload).digest('hex')}`;
}

/**
 * Parse an on-chain HCS message and extract the commitment hash.
 * Returns null if the message is not a valid auctionlog commitment.
 */
function parseOnChainMessage(base64Message: string): {
  commitmentHash: string;
  auctionId: string;
  stage: string;
} | null {
  try {
    const decoded = Buffer.from(base64Message, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded) as Record<string, unknown>;
    if (
      typeof parsed.commitmentHash === 'string' &&
      typeof parsed.auctionId === 'string' &&
      typeof parsed.stage === 'string'
    ) {
      return {
        commitmentHash: parsed.commitmentHash as string,
        auctionId: parsed.auctionId as string,
        stage: parsed.stage as string,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function verifyCommitments(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger, state } = args;

  const validArgs = VerifyInputSchema.parse(args.args);
  const currentNetwork = api.network.getCurrentNetwork();
  const onChain = validArgs.onChain === true;

  logger.info(`Verifying audit log for auction: ${validArgs.auctionId}`);
  if (onChain) {
    logger.info('On-chain verification enabled — will fetch HCS messages');
  }

  try {
    // Determine which stages to verify
    const stagesToCheck: AuctionStage[] = validArgs.stage
      ? [validArgs.stage]
      : VALID_STAGES;

    // Load auction metadata to get topicId
    const auctionMeta = state.get<AuctionMeta>(
      AUCTIONLOG_NAMESPACE,
      validArgs.auctionId,
    );

    if (!auctionMeta || !auctionMeta.topicId) {
      return {
        status: Status.Failure,
        errorMessage: `No audit log found for auction ${validArgs.auctionId}. Publish commitments first with: auctionlog publish --auction-id ${validArgs.auctionId} --stage created`,
      };
    }

    // If on-chain verification is requested, fetch all topic messages up front
    const onChainMessages = new Map<string, string>(); // stage → commitmentHash
    if (onChain) {
      try {
        logger.info(
          `Fetching messages from topic ${auctionMeta.topicId}...`,
        );
        const response = await api.mirror.getTopicMessages({
          topicId: auctionMeta.topicId,
        });

        for (const msg of response.messages) {
          const parsed = parseOnChainMessage(msg.message);
          if (parsed && parsed.auctionId === validArgs.auctionId) {
            onChainMessages.set(parsed.stage, parsed.commitmentHash);
          }
        }
        logger.info(
          `Found ${onChainMessages.size} on-chain commitment(s) for this auction`,
        );
      } catch (mirrorError: unknown) {
        logger.warn(
          `Mirror node query failed: ${mirrorError instanceof Error ? mirrorError.message : String(mirrorError)}. Falling back to local-only verification.`,
        );
      }
    }

    const entries: Array<{
      stage: string;
      commitmentHash: string;
      localVerified: boolean;
      onChainVerified: boolean | null;
      timestamp: string;
      sequenceNumber: number;
      reason?: string;
    }> = [];

    for (const stage of stagesToCheck) {
      const stateKey = `${validArgs.auctionId}:${stage}`;
      const entry = state.get<AuditLogEntry>(AUCTIONLOG_NAMESPACE, stateKey);

      if (!entry) {
        // Stage not published yet — skip
        continue;
      }

      // Layer 1: Local integrity check
      const recomputed = recomputeHash(entry);
      const localVerified = recomputed === entry.commitmentHash;

      // Layer 2: On-chain verification (if available)
      let onChainVerified: boolean | null = null;
      const reasons: string[] = [];

      if (!localVerified) {
        reasons.push(
          `Local hash mismatch: expected ${entry.commitmentHash}, recomputed ${recomputed}. Local data may have been tampered with.`,
        );
      }

      if (onChain) {
        const onChainHash = onChainMessages.get(stage);
        if (onChainHash === undefined) {
          onChainVerified = false;
          reasons.push(
            `On-chain: no matching message found for stage '${stage}' in topic ${auctionMeta.topicId}.`,
          );
        } else if (onChainHash === entry.commitmentHash) {
          onChainVerified = true;
        } else {
          onChainVerified = false;
          reasons.push(
            `On-chain hash mismatch: local has ${entry.commitmentHash}, chain has ${onChainHash}. Local state may have been altered after publication.`,
          );
        }
      }

      entries.push({
        stage,
        commitmentHash: entry.commitmentHash,
        localVerified,
        onChainVerified,
        timestamp: entry.timestamp,
        sequenceNumber: entry.sequenceNumber,
        reason: reasons.length > 0 ? reasons.join(' ') : undefined,
      });
    }

    if (entries.length === 0) {
      return {
        status: Status.Failure,
        errorMessage: `No published stages found for auction ${validArgs.auctionId}${validArgs.stage ? ` at stage '${validArgs.stage}'` : ''}`,
      };
    }

    const localVerifiedCount = entries.filter((e) => e.localVerified).length;
    const onChainVerifiedCount = onChain
      ? entries.filter((e) => e.onChainVerified === true).length
      : null;

    const allLocalValid = localVerifiedCount === entries.length;
    const allOnChainValid = onChain
      ? onChainVerifiedCount === entries.length
      : null;

    const output: VerifyOutput = VerifyOutputSchema.parse({
      auctionId: validArgs.auctionId,
      topicId: auctionMeta.topicId,
      network: currentNetwork,
      totalStages: entries.length,
      localVerifiedCount,
      onChainVerifiedCount,
      allLocalValid,
      allOnChainValid,
      onChainEnabled: onChain,
      entries,
    });

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError(
        'Failed to verify audit commitments',
        error,
      ),
    };
  }
}

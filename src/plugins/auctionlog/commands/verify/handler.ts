/**
 * Auctionlog Verify Command Handler
 *
 * Verifies the integrity of auction audit commitments by:
 * 1. Loading stored entries from local state
 * 2. Re-computing the commitment hash from the stored fields
 * 3. Comparing against the originally published hash
 *
 * This proves that no fields have been tampered with since publication.
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { createHash } from 'crypto';

import { AUCTIONLOG_NAMESPACE } from '../../manifest';
import type { AuditLogEntry, AuctionStage } from '../../types';
import { VALID_STAGES } from '../../types';
import { VerifyInputSchema } from './input';
import { VerifyOutputSchema, type VerifyOutput } from './output';

function recomputeHash(entry: AuditLogEntry): string {
  const payload = JSON.stringify({
    auctionId: entry.auctionId,
    stage: entry.stage,
    cantonRef: entry.cantonRef,
    adiTx: entry.adiTx,
    timestamp: entry.timestamp,
    nonce: entry.nonce,
  });
  return `0x${createHash('sha256').update(payload).digest('hex')}`;
}

export async function verifyCommitments(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger, state } = args;

  const validArgs = VerifyInputSchema.parse(args.args);
  const currentNetwork = args.api.network.getCurrentNetwork();

  logger.info(`Verifying audit log for auction: ${validArgs.auctionId}`);

  try {
    // Determine which stages to verify
    const stagesToCheck: AuctionStage[] = validArgs.stage
      ? [validArgs.stage]
      : VALID_STAGES;

    // Load auction metadata to get topicId
    const auctionMeta = state.get<{ topicId: string }>(
      AUCTIONLOG_NAMESPACE,
      validArgs.auctionId,
    );

    if (!auctionMeta || !auctionMeta.topicId) {
      return {
        status: Status.Failure,
        errorMessage: `No audit log found for auction ${validArgs.auctionId}. Publish commitments first with: auctionlog publish --auction-id ${validArgs.auctionId} --stage created`,
      };
    }

    const entries: Array<{
      stage: string;
      commitmentHash: string;
      verified: boolean;
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

      const recomputed = recomputeHash(entry);
      const verified = recomputed === entry.commitmentHash;

      entries.push({
        stage,
        commitmentHash: entry.commitmentHash,
        verified,
        timestamp: entry.timestamp,
        sequenceNumber: entry.sequenceNumber,
        reason: verified
          ? undefined
          : `Hash mismatch: expected ${entry.commitmentHash}, got ${recomputed}. Data may have been tampered with.`,
      });
    }

    if (entries.length === 0) {
      return {
        status: Status.Failure,
        errorMessage: `No published stages found for auction ${validArgs.auctionId}${validArgs.stage ? ` at stage '${validArgs.stage}'` : ''}`,
      };
    }

    const verifiedCount = entries.filter((e) => e.verified).length;

    const output: VerifyOutput = VerifyOutputSchema.parse({
      auctionId: validArgs.auctionId,
      topicId: auctionMeta.topicId,
      network: currentNetwork,
      totalStages: entries.length,
      verifiedCount,
      allValid: verifiedCount === entries.length,
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

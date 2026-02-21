/**
 * Auctionlog Export Command Handler
 *
 * Exports the full audit timeline for an auction as JSON or CSV.
 * This produces an artifact that procurement teams, auditors, or
 * regulators can review — it proves fairness and timing without
 * revealing any confidential bid data.
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import * as fs from 'fs';

import { AUCTIONLOG_NAMESPACE } from '../../manifest';
import type { AuditLogEntry } from '../../types';
import { VALID_STAGES } from '../../types';
import { ExportInputSchema } from './input';
import { ExportOutputSchema, type ExportOutput } from './output';

export async function exportAuditLog(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger, state } = args;

  const validArgs = ExportInputSchema.parse(args.args);
  const currentNetwork = args.api.network.getCurrentNetwork();

  logger.info(
    `Exporting audit log for auction ${validArgs.auctionId} as ${validArgs.type}`,
  );

  try {
    // Load auction metadata
    const auctionMeta = state.get<{ topicId: string }>(
      AUCTIONLOG_NAMESPACE,
      validArgs.auctionId,
    );

    if (!auctionMeta || !auctionMeta.topicId) {
      return {
        status: Status.Failure,
        errorMessage: `No audit log found for auction ${validArgs.auctionId}`,
      };
    }

    // Collect all published stages
    const entries: Array<{
      stage: string;
      commitmentHash: string;
      timestamp: string;
      sequenceNumber: number;
      cantonRef: string;
      adiTx: string;
      nonce: string;
    }> = [];

    for (const stage of VALID_STAGES) {
      const stateKey = `${validArgs.auctionId}:${stage}`;
      const entry = state.get<AuditLogEntry>(AUCTIONLOG_NAMESPACE, stateKey);
      if (entry) {
        entries.push({
          stage: entry.stage,
          commitmentHash: entry.commitmentHash,
          timestamp: entry.timestamp,
          sequenceNumber: entry.sequenceNumber,
          cantonRef: entry.cantonRef,
          adiTx: entry.adiTx,
          nonce: entry.nonce,
        });
      }
    }

    // Sort by sequence number
    entries.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    if (entries.length === 0) {
      return {
        status: Status.Failure,
        errorMessage: `No published stages found for auction ${validArgs.auctionId}`,
      };
    }

    // Generate export content
    let fileContent: string;
    const exportFormat = validArgs.type ?? 'json';

    if (exportFormat === 'csv') {
      const headers = [
        'sequence',
        'stage',
        'timestamp',
        'commitmentHash',
        'cantonRef',
        'adiTx',
        'nonce',
      ];
      const rows = entries.map((e) =>
        [
          e.sequenceNumber,
          e.stage,
          e.timestamp,
          e.commitmentHash,
          e.cantonRef,
          e.adiTx,
          e.nonce,
        ].join(','),
      );
      fileContent = [headers.join(','), ...rows].join('\n');
    } else {
      fileContent = JSON.stringify(
        {
          auctionId: validArgs.auctionId,
          topicId: auctionMeta.topicId,
          network: currentNetwork,
          exportedAt: new Date().toISOString(),
          entries,
        },
        null,
        2,
      );
    }

    // Write to file if path provided
    let filePath: string | undefined;
    if (validArgs.file) {
      fs.writeFileSync(validArgs.file, fileContent, 'utf8');
      filePath = validArgs.file;
      logger.info(`Written to ${filePath}`);
    }

    const output: ExportOutput = ExportOutputSchema.parse({
      auctionId: validArgs.auctionId,
      topicId: auctionMeta.topicId,
      network: currentNetwork,
      exportFormat,
      entryCount: entries.length,
      entries,
      filePath,
    });

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to export audit log', error),
    };
  }
}

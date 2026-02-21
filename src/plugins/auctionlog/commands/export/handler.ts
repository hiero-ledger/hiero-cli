/**
 * Auctionlog Export Command Handler
 *
 * Exports the full audit timeline for an auction as JSON or CSV.
 * This produces an artifact that procurement teams, auditors, or
 * regulators can review — it proves fairness and timing without
 * revealing any confidential bid data.
 *
 * ⚠️  SENSITIVE: The export includes nonces and private metadata that
 * are NOT published on-chain. Treat the exported file as confidential.
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import * as fs from 'fs';
import * as path from 'path';

import { AUCTIONLOG_NAMESPACE } from '../../manifest';
import type { AuditLogEntry, AuctionMeta } from '../../types';
import { VALID_STAGES } from '../../types';
import { ExportInputSchema } from './input';
import { ExportOutputSchema, type ExportOutput } from './output';

/**
 * Escape a CSV field value to handle commas, quotes, and newlines.
 */
function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportAuditLog(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger, state } = args;

  const validArgs = ExportInputSchema.parse(args.args);
  const currentNetwork = args.api.network.getCurrentNetwork();
  const exportFormat = validArgs.type ?? 'json';
  const redact = validArgs.redact === true;

  logger.info(
    `Exporting audit log for auction ${validArgs.auctionId} as ${exportFormat}`,
  );

  try {
    // Load auction metadata
    const auctionMeta = state.get<AuctionMeta>(
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
      metadata: string;
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
          metadata: redact ? '[REDACTED]' : (entry.metadata ?? ''),
          nonce: redact ? '[REDACTED]' : entry.nonce,
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

    if (exportFormat === 'csv') {
      const headers = [
        'sequence',
        'stage',
        'timestamp',
        'commitmentHash',
        'metadata',
        'nonce',
      ];
      const rows = entries.map((e) =>
        [
          escapeCsvField(e.sequenceNumber),
          escapeCsvField(e.stage),
          escapeCsvField(e.timestamp),
          escapeCsvField(e.commitmentHash),
          escapeCsvField(e.metadata),
          escapeCsvField(e.nonce),
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
          sensitive: !redact,
          entries,
        },
        null,
        2,
      );
    }

    // Write to file if path provided
    let filePath: string | undefined;
    if (validArgs.file) {
      try {
        // Resolve to absolute path and ensure parent directory exists
        const resolvedPath = path.resolve(validArgs.file);
        const parentDir = path.dirname(resolvedPath);

        if (!fs.existsSync(parentDir)) {
          return {
            status: Status.Failure,
            errorMessage: `Output directory does not exist: ${parentDir}`,
          };
        }

        fs.writeFileSync(resolvedPath, fileContent, 'utf8');
        filePath = resolvedPath;
        logger.info(`Audit log written to ${filePath}`);
        if (!redact) {
          logger.warn(
            'This export contains sensitive data (nonces, metadata). Treat the file as confidential.',
          );
        }
      } catch (writeError: unknown) {
        return {
          status: Status.Failure,
          errorMessage: formatError(
            `Failed to write export file to ${validArgs.file}`,
            writeError,
          ),
        };
      }
    }

    const output: ExportOutput = ExportOutputSchema.parse({
      auctionId: validArgs.auctionId,
      topicId: auctionMeta.topicId,
      network: currentNetwork,
      exportFormat,
      entryCount: entries.length,
      entries,
      filePath,
      redacted: redact,
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

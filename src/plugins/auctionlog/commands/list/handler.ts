/**
 * Auctionlog List Command Handler
 *
 * Lists all tracked auctions and their audit stages.
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

import { AUCTIONLOG_NAMESPACE } from '../../manifest';
import type { AuditLogEntry } from '../../types';
import { VALID_STAGES } from '../../types';
import { ListOutputSchema, type ListOutput } from './output';

export async function listAuctions(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { state } = args;
  const currentNetwork = args.api.network.getCurrentNetwork();

  try {
    // Get all keys from the auctionlog namespace
    const allKeys = state.getKeys(AUCTIONLOG_NAMESPACE) || [];

    // Filter to auction-level keys (no colon = auction metadata, not stage entries)
    const auctionKeys = allKeys.filter((k: string) => !k.includes(':'));

    const auctions: Array<{
      auctionId: string;
      topicId: string;
      lastStage: string;
      lastUpdated: string;
      stageCount: number;
    }> = [];

    for (const key of auctionKeys) {
      const meta = state.get<{
        topicId: string;
        lastStage: string;
        lastUpdated: string;
      }>(AUCTIONLOG_NAMESPACE, key);

      if (meta && meta.topicId) {
        // Count stages published for this auction
        let stageCount = 0;
        for (const stage of VALID_STAGES) {
          const entry = state.get<AuditLogEntry>(
            AUCTIONLOG_NAMESPACE,
            `${key}:${stage}`,
          );
          if (entry) stageCount++;
        }

        auctions.push({
          auctionId: key,
          topicId: meta.topicId,
          lastStage: meta.lastStage || 'unknown',
          lastUpdated: meta.lastUpdated || 'unknown',
          stageCount,
        });
      }
    }

    const output: ListOutput = ListOutputSchema.parse({
      network: currentNetwork,
      auctions,
      totalAuctions: auctions.length,
    });

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to list auctions', error),
    };
  }
}

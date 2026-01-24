/**
 * Batch Summary Command Handler
 * Lists recent batch operations from state
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { BatchSummaryOutput } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { BATCH_NAMESPACE, type BatchOperation } from '@/plugins/batch/schema';

import { BatchSummaryInputSchema } from './input';

export async function batchSummaryHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  logger.info('[BATCH] Batch summary command invoked');

  const validArgs = BatchSummaryInputSchema.parse(args.args);
  const { limit } = validArgs;

  try {
    // Get all batch operations from state
    const allOperations = api.state.list<BatchOperation>(BATCH_NAMESPACE);

    // Sort by createdAt descending
    const sortedOperations = [...allOperations]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, limit);

    const summaryItems = sortedOperations.map((op: BatchOperation) => ({
      id: op.id,
      type: op.type,
      status: op.status,
      totalOperations: op.totalOperations,
      successCount: op.successCount,
      failedCount: op.failedCount,
      createdAt: op.createdAt,
    }));

    const outputData: BatchSummaryOutput = {
      operations: summaryItems,
      totalCount: allOperations.length,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to get batch summary', error),
    };
  }
}

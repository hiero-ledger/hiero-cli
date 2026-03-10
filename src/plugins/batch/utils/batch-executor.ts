/**
 * Batch Executor Utility
 *
 * Executes a batch of operations sequentially, collecting results
 * and generating a summary report.
 */
import type { Logger } from '@/core';

export interface BatchRowResult {
  row: number;
  status: 'success' | 'failed';
  transactionId?: string;
  errorMessage?: string;
  details: Record<string, unknown>;
}

export interface BatchSummary {
  total: number;
  succeeded: number;
  failed: number;
  results: BatchRowResult[];
}

/**
 * Execute a batch of operations sequentially.
 *
 * @param rows - Array of items to process
 * @param executor - Async function that processes a single row
 * @param logger - Logger instance for progress tracking
 * @returns BatchSummary with per-row results
 */
export async function executeBatch<T>(
  rows: T[],
  executor: (row: T) => Promise<Omit<BatchRowResult, 'row'>>,
  logger: Logger,
): Promise<BatchSummary> {
  const results: BatchRowResult[] = [];
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    logger.info(`Processing row ${i + 1} of ${rows.length}...`);

    try {
      const result = await executor(rows[i]);
      const rowResult: BatchRowResult = {
        row: i + 1,
        ...result,
      };
      results.push(rowResult);

      if (result.status === 'success') {
        succeeded++;
      } else {
        failed++;
      }
    } catch (error: unknown) {
      failed++;
      results.push({
        row: i + 1,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        details: {},
      });
    }
  }

  return {
    total: rows.length,
    succeeded,
    failed,
    results,
  };
}

/**
 * Account List Command Handler
 * Handles listing all accounts using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { Command } from '@/core/commands/command.interface';
import type {
  CommandHandlerArgs,
  CommandResult,
} from '@/core/plugins/plugin.interface';
import type { ListBatchesOutput } from './output';

import { ZustandBatchStateHelper } from '@/plugins/batch/zustand-state-helper';

export class ListBatchCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const batchState = new ZustandBatchStateHelper(api.state, logger);

    logger.info('Listing all batches...');

    const batches = batchState.listBatches();

    // Prepare output data
    const outputData: ListBatchesOutput = {
      batches: batches.map((batch) => ({
        name: batch.name,
        batchKey: api.kms.get(batch.keyRefId)?.publicKey ?? undefined,
        transactionCount: batch.transactions.length,
        executed: batch.executed,
        success: batch.success,
      })),
      totalCount: batches.length,
    };

    return { result: outputData };
  }
}

export async function listBatch(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ListBatchCommand().execute(args);
}

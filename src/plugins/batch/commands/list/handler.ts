import type { Command } from '@/core/commands/command.interface';
import type {
  CommandHandlerArgs,
  CommandResult,
} from '@/core/plugins/plugin.interface';
import type { BatchStateService } from '@/plugins/batch/services/batch-state.service.interface';
import type { BatchListOutput } from './output';

import { BatchStateServiceImpl } from '@/plugins/batch/services/batch-state.service';

export class BatchListCommand implements Command {
  constructor(private readonly batchState: BatchStateService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    api.logger.info('Listing all batches...');

    const batches = this.batchState.listBatches();

    const outputData: BatchListOutput = {
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

export async function batchList(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;
  const batchState = new BatchStateServiceImpl(api.state, api.logger);
  return new BatchListCommand(batchState).execute(args);
}

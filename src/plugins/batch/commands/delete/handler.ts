import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { BatchStateService } from '@/plugins/batch/services/batch-state.service.interface';
import type { BatchDeleteOutput } from './output';

import { NotFoundError } from '@/core/errors';
import { composeKey } from '@/core/utils/key-composer';
import { BatchStateServiceImpl } from '@/plugins/batch/services/batch-state.service';

import { BatchDeleteInputSchema } from './input';

export class BatchDeleteCommand implements Command {
  constructor(private readonly batchState: BatchStateService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = BatchDeleteInputSchema.parse(args.args);
    const name = validArgs.name;
    const order = validArgs.order;
    const network = api.network.getCurrentNetwork();
    const key = composeKey(network, name);

    const batch = this.batchState.getBatch(key);
    if (!batch) {
      throw new NotFoundError(`Batch not found: ${name}`, {
        context: { name },
      });
    }

    if (order) {
      const transactionIndex = batch.transactions.findIndex(
        (tx) => tx.order === order,
      );
      if (transactionIndex === -1) {
        throw new NotFoundError(
          `Transaction with order ${order} not found in batch '${name}'`,
          { context: { name, order } },
        );
      }

      batch.transactions.splice(transactionIndex, 1);
      this.batchState.saveBatch(key, batch);

      api.logger.info(
        `Removed transaction at order ${order} from batch '${name}'`,
      );

      const outputData: BatchDeleteOutput = {
        name,
        order,
      };
      return { result: outputData };
    }

    this.batchState.deleteBatch(key);
    api.logger.info(`Deleted batch '${name}'`);

    const outputData: BatchDeleteOutput = {
      name,
    };
    return { result: outputData };
  }
}

export async function batchDelete(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;
  const batchState = new BatchStateServiceImpl(api.state, api.logger);
  return new BatchDeleteCommand(batchState).execute(args);
}

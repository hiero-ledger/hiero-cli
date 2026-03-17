/**
 * Batch Delete Command Handler
 * Deletes a whole batch by name or a single transaction by name and order
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { BatchDeleteOutput } from './output';

import { NotFoundError } from '@/core/errors';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandBatchStateHelper } from '@/plugins/batch/zustand-state-helper';

import { BatchDeleteInputSchema } from './input';

export class BatchDeleteCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const batchState = new ZustandBatchStateHelper(api.state, logger);
    const validArgs = BatchDeleteInputSchema.parse(args.args);
    const name = validArgs.name;
    const order = validArgs.order;
    const network = api.network.getCurrentNetwork();
    const key = composeKey(network, name);

    const batch = batchState.getBatch(key);
    if (!batch) {
      throw new NotFoundError(`Batch not found: ${name}`, {
        context: { name },
      });
    }

    if (order) {
      // Delete single transaction by order
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
      batchState.saveBatch(key, batch);

      logger.info(`Removed transaction at order ${order} from batch '${name}'`);

      const outputData: BatchDeleteOutput = {
        name,
        order,
      };
      return { result: outputData };
    }

    // Delete whole batch
    batchState.deleteBatch(key);
    logger.info(`Deleted batch '${name}'`);

    const outputData: BatchDeleteOutput = {
      name,
    };
    return { result: outputData };
  }
}

export async function batchDelete(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new BatchDeleteCommand().execute(args);
}

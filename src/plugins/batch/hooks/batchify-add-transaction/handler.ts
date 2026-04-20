import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PreExecuteTransactionHookParams } from '@/core/hooks/types';
import type {
  BaseBuildTransactionResult,
  BaseSignTransactionResult,
} from '@/core/types/transaction.types';
import type { BatchifyHookBaseParams } from '@/plugins/batch/hooks/shared/types';

import { NotFoundError, ValidationError } from '@/core';
import { composeKey } from '@/core/utils/key-composer';
import {
  BATCHIFY_TEMPLATE,
  BatchifyOutputSchema,
} from '@/plugins/batch/hooks/batchify-add-transaction/output';
import { BatchifyInputSchema } from '@/plugins/batch/hooks/shared/input';
import { ZustandBatchStateHelper } from '@/plugins/batch/zustand-state-helper';

export class BatchifyAddTransactionHook implements Hook<
  PreExecuteTransactionHookParams<
    BatchifyHookBaseParams,
    BaseBuildTransactionResult,
    BaseSignTransactionResult
  >
> {
  static readonly BATCH_MAXIMUM_SIZE = 50;

  execute(
    params: PreExecuteTransactionHookParams<
      BatchifyHookBaseParams,
      BaseBuildTransactionResult,
      BaseSignTransactionResult
    >,
  ): Promise<HookResult> {
    const { args, commandName, normalisedParams, signTransactionResult } =
      params;
    const { api, logger } = args;
    const batchState = new ZustandBatchStateHelper(api.state, logger);
    const validArgs = BatchifyInputSchema.parse(args.args);
    const batchName = validArgs.batch;
    const network = api.network.getCurrentNetwork();
    if (!batchName) {
      logger.debug(
        'No parameter "batch" found. Transaction will not be added to batch.',
      );
      return Promise.resolve({ breakFlow: false });
    }
    const key = composeKey(network, batchName);
    const batch = batchState.getBatch(key);
    if (!batch) {
      throw new NotFoundError(`Batch not found for name ${batchName}`);
    }
    if (
      batch.transactions.length >= BatchifyAddTransactionHook.BATCH_MAXIMUM_SIZE
    ) {
      throw new ValidationError(
        `Couldn't add new transaction to batch ${batchName} as it will exceed batch transaction maximum size ${BatchifyAddTransactionHook.BATCH_MAXIMUM_SIZE}`,
      );
    }
    const transaction = signTransactionResult.signedTransaction;
    const keyRefIds = normalisedParams.keyRefIds;

    const transactionBytes = Buffer.from(transaction.toBytes()).toString('hex');
    const highestOrder =
      batch.transactions.length === 0
        ? 0
        : Math.max(...batch.transactions.map((tx) => tx.order));
    const nextOrder = highestOrder + 1;

    batch.transactions.push({
      transactionBytes,
      order: nextOrder,
      command: commandName,
      normalizedParams: normalisedParams,
      keyRefIds,
    });
    batchState.saveBatch(key, batch);

    logger.info(
      `Transaction added to batch '${batchName}' at position ${nextOrder}`,
    );

    return Promise.resolve({
      breakFlow: true,
      result: {
        batchName,
        transactionOrder: nextOrder,
      },
      schema: BatchifyOutputSchema,
      humanTemplate: BATCHIFY_TEMPLATE,
    });
  }
}

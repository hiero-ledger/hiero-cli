import type { CommandHandlerArgs } from '@/core';
import type {
  HookResult,
  PreExecuteTransactionParams,
  PreSignTransactionParams,
} from '@/core/hooks/types';
import type {
  BaseBuildTransactionResult,
  BaseSignTransactionResult,
} from '@/core/types/transaction.types';
import type { BatchifyHookBaseParams } from './types';

import { PublicKey } from '@hashgraph/sdk';

import { NotFoundError, ValidationError } from '@/core';
import { AbstractHook } from '@/core/hooks/abstract-hook';
import { composeKey } from '@/core/utils/key-composer';
import { BatchifyInputSchema } from '@/plugins/batch/hooks/batchify/input';
import {
  BATCHIFY_TEMPLATE,
  BatchifyOutputSchema,
} from '@/plugins/batch/hooks/batchify/output';
import { ZustandBatchStateHelper } from '@/plugins/batch/zustand-state-helper';

export class BatchifyHook extends AbstractHook {
  static readonly BATCH_MAXIMUM_SIZE = 50;

  override preSignTransactionHook(
    args: CommandHandlerArgs,
    params: PreSignTransactionParams<
      Record<string, unknown>,
      BaseBuildTransactionResult
    >,
    _commandName: string,
  ): Promise<HookResult> {
    const { api, logger } = args;
    const batchState = new ZustandBatchStateHelper(api.state, logger);
    const validArgs = BatchifyInputSchema.parse(args.args);
    const batchName = validArgs.batch;
    const network = api.network.getCurrentNetwork();
    if (!batchName) {
      logger.debug(
        'No parameter "batch" found. Transaction will not be added to batch.',
      );
      return Promise.resolve({
        breakFlow: false,
        result: {
          message: 'No "batch" parameter found',
        },
      });
    }
    const key = composeKey(network, batchName);
    const batch = batchState.getBatch(key);
    if (!batch) {
      throw new NotFoundError(`Batch not found for name ${batchName}`);
    }
    if (batch.executed) {
      throw new ValidationError(
        `Batch "${batch.name}" has been already executed `,
      );
    }
    const batchKey = api.kms.get(batch.keyRefId);
    if (!batchKey) {
      throw new NotFoundError(
        `Batch key with key reference ${batchKey} not found`,
      );
    }
    params.buildTransactionResult.transaction.setBatchKey(
      PublicKey.fromString(batchKey.publicKey),
    );
    return Promise.resolve({
      breakFlow: false,
      result: {
        message: 'success',
      },
    });
  }

  override preExecuteTransactionHook(
    args: CommandHandlerArgs,
    params: PreExecuteTransactionParams<
      BatchifyHookBaseParams,
      BaseBuildTransactionResult,
      BaseSignTransactionResult
    >,
    commandName: string,
  ): Promise<HookResult> {
    const { api, logger } = args;
    const batchState = new ZustandBatchStateHelper(api.state, logger);
    const validArgs = BatchifyInputSchema.parse(args.args);
    const batchName = validArgs.batch;
    const network = api.network.getCurrentNetwork();
    if (!batchName) {
      logger.debug(
        'No parameter "batch" found. Transaction will not be added to batch.',
      );
      return Promise.resolve({
        breakFlow: false,
        result: {
          message: 'No "batch" parameter found',
        },
      });
    }
    const key = composeKey(network, batchName);
    const batch = batchState.getBatch(key);
    if (!batch) {
      throw new NotFoundError(`Batch not found for name ${batchName}`);
    }
    if (batch.transactions.length >= BatchifyHook.BATCH_MAXIMUM_SIZE) {
      throw new ValidationError(
        `Couldn't add new transaction to batch ${batchName} as it will exceed batch transaction maximum size ${BatchifyHook.BATCH_MAXIMUM_SIZE}`,
      );
    }
    const transaction = params.signTransactionResult.signedTransaction;
    const keyRefIds = params.normalisedParams.keyRefIds;

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
      normalizedParams: params.normalisedParams,
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

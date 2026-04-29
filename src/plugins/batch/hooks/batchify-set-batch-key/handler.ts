import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PreSignTransactionHookParams } from '@/core/hooks/types';
import type { BaseBuildTransactionResult } from '@/core/types/transaction.types';
import type { BatchifyHookBaseParams } from '@/plugins/batch/hooks/shared/types';

import { PublicKey } from '@hiero-ledger/sdk';

import { NotFoundError, ValidationError } from '@/core';
import { composeKey } from '@/core/utils/key-composer';
import { BatchifyInputSchema } from '@/plugins/batch/hooks/shared/input';
import { ZustandBatchStateHelper } from '@/plugins/batch/zustand-state-helper';

export class BatchifySetBatchKeyHook implements Hook<
  PreSignTransactionHookParams<
    BatchifyHookBaseParams,
    BaseBuildTransactionResult
  >
> {
  execute(
    params: PreSignTransactionHookParams<
      BatchifyHookBaseParams,
      BaseBuildTransactionResult
    >,
  ): Promise<HookResult> {
    const { args, buildTransactionResult } = params;
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
    if (batch.executed) {
      throw new ValidationError(
        `Batch "${batch.name}" has been already executed `,
      );
    }
    const batchKey = api.kms.get(batch.keyRefId);
    if (!batchKey) {
      throw new NotFoundError(
        `Batch key with key reference ${batch.keyRefId} not found`,
      );
    }
    buildTransactionResult.transaction.setBatchKey(
      PublicKey.fromString(batchKey.publicKey),
    );
    return Promise.resolve({ breakFlow: false });
  }
}

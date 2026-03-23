import type { CommandHandlerArgs, CoreApi, Logger } from '@/core';
import type {
  HookResult,
  PreOutputPreparationParams,
} from '@/core/hooks/types';
import type {
  BatchDataItem,
  BatchExecuteTransactionResult,
} from '@/core/types/shared.types';

import { AbstractHook } from '@/core/hooks/abstract-hook';
import { ACCOUNT_DELETE_COMMAND_NAME } from '@/plugins/account/commands/delete/handler';
import { removeAccountFromLocalState } from '@/plugins/account/commands/delete/remove-account-from-state';
import { AccountDeleteNormalisedParamsSchema } from '@/plugins/account/hooks/batch-delete/types';

export class AccountDeleteBatchStateHook extends AbstractHook {
  override async preOutputPreparationHook(
    args: CommandHandlerArgs,
    params: PreOutputPreparationParams<
      unknown,
      unknown,
      unknown,
      BatchExecuteTransactionResult
    >,
  ): Promise<HookResult> {
    const { api, logger } = args;
    const batchData = params.executeTransactionResult.updatedBatchData;
    if (!batchData.success) {
      return Promise.resolve({
        breakFlow: false,
        result: {
          message: 'Batch transaction status failure',
        },
      });
    }
    for (const batchDataItem of [...batchData.transactions].filter(
      (item) => item.command === ACCOUNT_DELETE_COMMAND_NAME,
    )) {
      this.removeAccountAfterBatch(api, logger, batchDataItem);
    }
    return Promise.resolve({
      breakFlow: false,
      result: {
        message: 'success',
      },
    });
  }

  private removeAccountAfterBatch(
    api: CoreApi,
    logger: Logger,
    batchDataItem: BatchDataItem,
  ): void {
    const parseResult = AccountDeleteNormalisedParamsSchema.safeParse(
      batchDataItem.normalizedParams,
    );
    if (!parseResult.success) {
      logger.warn(
        'Account delete batch state hook: normalized params did not match schema; skipping local state cleanup',
      );
      return;
    }
    const normalisedParams = parseResult.data;
    removeAccountFromLocalState(
      api,
      logger,
      normalisedParams.accountToDelete,
      normalisedParams.network,
    );
  }
}

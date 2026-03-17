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
import { TOKEN_ASSOCIATE_COMMAND_NAME } from '@/plugins/token/commands/associate';
import { saveAssociationToState } from '@/plugins/token/utils/token-associations';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { AssociateNormalizedParamsSchema } from './types';

export class TokenAssociateBatchStateHook extends AbstractHook {
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
      (item) => item.command === TOKEN_ASSOCIATE_COMMAND_NAME,
    )) {
      this.saveAssociations(api, logger, batchDataItem);
    }
    return Promise.resolve({
      breakFlow: false,
      result: {
        message: 'success',
      },
    });
  }

  private saveAssociations(
    api: CoreApi,
    logger: Logger,
    batchDataItem: BatchDataItem,
  ): void {
    const parseResult = AssociateNormalizedParamsSchema.safeParse(
      batchDataItem.normalizedParams,
    );
    if (!parseResult.success) {
      logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }
    const normalisedParams = parseResult.data;

    if (normalisedParams.alreadyAssociated) {
      logger.debug(
        `Skipping already associated token ${normalisedParams.tokenId} for account ${normalisedParams.account.accountId}`,
      );
      return;
    }

    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    saveAssociationToState(
      tokenState,
      normalisedParams.tokenId,
      normalisedParams.account.accountId,
      normalisedParams.network,
      logger,
    );
  }
}

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
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { TOKEN_DELETE_COMMAND_NAME } from '@/plugins/token/commands/delete';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { DeleteNormalizedParamsSchema } from './types';

export class TokenDeleteBatchStateHook extends AbstractHook {
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
        result: { message: 'Batch transaction status failure' },
      });
    }

    for (const batchDataItem of [...batchData.transactions].filter(
      (item) => item.command === TOKEN_DELETE_COMMAND_NAME,
    )) {
      this.cleanupState(api, logger, batchDataItem);
    }

    return Promise.resolve({
      breakFlow: false,
      result: { message: 'success' },
    });
  }

  private cleanupState(
    api: CoreApi,
    logger: Logger,
    batchDataItem: BatchDataItem,
  ): void {
    const parseResult = DeleteNormalizedParamsSchema.safeParse(
      batchDataItem.normalizedParams,
    );

    if (!parseResult.success) {
      logger.warn('Problem parsing delete batch data. State cleanup skipped.');
      return;
    }

    const { network, tokenId } = parseResult.data;
    const tokenState = new ZustandTokenStateHelper(api.state, logger);
    const key = composeKey(network, tokenId);
    const tokenInState = tokenState.getToken(key);

    if (!tokenInState) return;

    const aliases = api.alias
      .list({ network, type: AliasType.Token })
      .filter((rec) => rec.entityId === tokenId);

    for (const rec of aliases) {
      api.alias.remove(rec.alias, network);
    }

    tokenState.removeToken(key);
    logger.debug(`Cleaned up state for deleted token ${tokenId}`);
  }
}

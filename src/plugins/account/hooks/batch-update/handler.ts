import type { CommandHandlerArgs, CoreApi, Logger } from '@/core';
import type {
  HookResult,
  PreOutputPreparationParams,
} from '@/core/hooks/types';
import type {
  BatchDataItem,
  BatchExecuteTransactionResult,
} from '@/core/types/shared.types';
import type { AccountData } from '@/plugins/account/schema';

import { AbstractHook } from '@/core/hooks/abstract-hook';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { ACCOUNT_UPDATE_COMMAND_NAME } from '@/plugins/account/commands/update/handler';
import { AccountUpdateNormalisedParamsSchema } from '@/plugins/account/hooks/batch-update/types';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

export class AccountUpdateBatchStateHook extends AbstractHook {
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
      (item) => item.command === ACCOUNT_UPDATE_COMMAND_NAME,
    )) {
      this.updateAccountState(api, logger, batchDataItem);
    }

    return Promise.resolve({
      breakFlow: false,
      result: {
        message: 'success',
      },
    });
  }

  private updateAccountState(
    api: CoreApi,
    logger: Logger,
    batchDataItem: BatchDataItem,
  ): void {
    const parseResult = AccountUpdateNormalisedParamsSchema.safeParse(
      batchDataItem.normalizedParams,
    );

    if (!parseResult.success) {
      logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }

    const {
      accountId,
      network,
      accountStateKey,
      newPublicKey,
      newKeyRefId,
      newKeyType,
    } = parseResult.data;

    if (!newKeyRefId || !newPublicKey) {
      return;
    }

    const accountState = new ZustandAccountStateHelper(api.state, logger);
    const existingAccount = accountState.getAccount(accountStateKey);

    if (!existingAccount) {
      logger.warn(
        `Account '${accountId}' not found in state after batch execution, skipping state update`,
      );
      return;
    }

    const updatedAccount: AccountData = {
      ...existingAccount,
      keyRefId: newKeyRefId,
      publicKey: newPublicKey,
      type: newKeyType ?? existingAccount.type,
    };

    accountState.saveAccount(accountStateKey, updatedAccount);

    const aliasesForAccount = api.alias
      .list({ network, type: AliasType.Account })
      .filter((rec) => rec.entityId === accountId);

    for (const rec of aliasesForAccount) {
      api.alias.remove(rec.alias, network);
      api.alias.register({
        ...rec,
        publicKey: newPublicKey,
        keyRefId: newKeyRefId,
      });
    }
  }
}

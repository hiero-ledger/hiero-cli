import type { CommandHandlerArgs, CoreApi, Logger } from '@/core';
import type {
  HookResult,
  PreOutputPreparationParams,
} from '@/core/hooks/types';
import type {
  BatchDataItem,
  BatchExecuteTransactionResult,
  TransactionResult,
} from '@/core/types/shared.types';
import type { AccountData } from '@/plugins/account/schema';

import { StateError } from '@/core';
import { AbstractHook } from '@/core/hooks/abstract-hook';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { ACCOUNT_CREATE_COMMAND_NAME } from '@/plugins/account/commands/create';
import { AccountCreateNormalisedParamsSchema } from '@/plugins/account/hooks/batch-create/types';
import { buildEvmAddressFromAccountId } from '@/plugins/account/utils/account-address';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

export class AccountCreateBatchStateHook extends AbstractHook {
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
      (item) => item.command === ACCOUNT_CREATE_COMMAND_NAME,
    )) {
      await this.saveAccount(api, logger, batchDataItem);
    }
    return Promise.resolve({
      breakFlow: false,
      result: {
        message: 'success',
      },
    });
  }

  private async saveAccount(
    api: CoreApi,
    logger: Logger,
    batchDataItem: BatchDataItem,
  ): Promise<void> {
    const parseResult = AccountCreateNormalisedParamsSchema.safeParse(
      batchDataItem.normalizedParams,
    );
    if (!parseResult.success) {
      logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }
    const normalisedParams = parseResult.data;
    const innerTransactionId = batchDataItem.transactionId;
    if (!innerTransactionId) {
      logger.warn(
        `No transaction ID found for batch transaction ${batchDataItem.order}`,
      );
      return;
    }

    const innerTransactionResult: TransactionResult =
      await api.receipt.getReceipt({
        transactionId: innerTransactionId,
      });

    if (!innerTransactionResult.accountId) {
      throw new StateError(
        'Transaction completed but did not return an account ID, unable to derive addresses',
      );
    }
    const evmAddress = buildEvmAddressFromAccountId(
      innerTransactionResult.accountId,
    );

    if (normalisedParams.alias) {
      api.alias.register({
        alias: normalisedParams.alias,
        type: AliasType.Account,
        network: normalisedParams.network,
        entityId: innerTransactionResult.accountId,
        evmAddress,
        publicKey: normalisedParams.publicKey,
        keyRefId: normalisedParams.keyRefId,
        createdAt: innerTransactionResult.consensusTimestamp,
      });
    }

    const accountData: AccountData = {
      name: normalisedParams.name,
      accountId: innerTransactionResult.accountId,
      type: normalisedParams.keyType,
      publicKey: normalisedParams.publicKey,
      evmAddress,
      keyRefId: normalisedParams.keyRefId,
      network: normalisedParams.network,
    };
    const accountKey = composeKey(
      normalisedParams.network,
      innerTransactionResult.accountId,
    );
    const accountState = new ZustandAccountStateHelper(api.state, logger);
    accountState.saveAccount(accountKey, accountData);
  }
}

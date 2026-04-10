import type { CommandHandlerArgs, CoreApi } from '@/core';
import type {
  CustomHandlerHookParams,
  HookResult,
  PreOutputPreparationParams,
} from '@/core/hooks/types';
import type {
  ScheduledData,
  ScheduledDataVerifyResult,
  TransactionResult,
} from '@/core/types/shared.types';
import type { AccountData } from '@/plugins/account/schema';

import { formatTransactionIdToDashFormat, StateError } from '@/core';
import { AbstractHook } from '@/core/hooks/abstract-hook';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { ACCOUNT_CREATE_COMMAND_NAME } from '@/plugins/account/commands/create';
import { AccountCreateNormalisedParamsSchema } from '@/plugins/account/hooks/batch-create/types';
import { buildEvmAddressFromAccountId } from '@/plugins/account/utils/account-address';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

export class AccountCreateScheduleStateHook extends AbstractHook {
  override async preOutputPreparationHook(
    args: CommandHandlerArgs,
    params: PreOutputPreparationParams<
      unknown,
      unknown,
      unknown,
      ScheduledDataVerifyResult
    >,
  ): Promise<HookResult> {
    const { api } = args;
    const scheduledData = params.executeTransactionResult.scheduledData;
    if (!scheduledData) {
      return Promise.resolve({
        breakFlow: false,
        result: {
          message: 'missing schedule data',
        },
      });
    }
    if (scheduledData.command !== ACCOUNT_CREATE_COMMAND_NAME) {
      return Promise.resolve({
        breakFlow: false,
        result: {
          message: 'success',
        },
      });
    }
    await this.saveAccount(api, scheduledData);
    return Promise.resolve({
      breakFlow: false,
      result: {
        message: 'success',
      },
    });
  }

  override async customHandlerHook(
    args: CommandHandlerArgs,
    params: CustomHandlerHookParams<ScheduledDataVerifyResult>,
  ): Promise<HookResult> {
    const { api } = args;
    const scheduledData = params.customHandlerParams.scheduledData;
    if (!scheduledData) {
      return Promise.resolve({
        breakFlow: false,
        result: {
          message: 'missing schedule data',
        },
      });
    }
    if (scheduledData.command !== ACCOUNT_CREATE_COMMAND_NAME) {
      return Promise.resolve({
        breakFlow: false,
        result: {
          message: 'success',
        },
      });
    }
    await this.saveAccount(api, scheduledData);
    return Promise.resolve({
      breakFlow: false,
      result: {
        message: 'success',
      },
    });
  }

  private async saveAccount(
    api: CoreApi,
    scheduledData: ScheduledData,
  ): Promise<void> {
    const parseResult = AccountCreateNormalisedParamsSchema.safeParse(
      scheduledData.normalizedParams,
    );
    if (!parseResult.success) {
      api.logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }
    const normalisedParams = parseResult.data;
    const innerTransactionId = scheduledData.transactionId;
    if (!innerTransactionId) {
      api.logger.warn(`No transaction ID found for scheduled transaction`);
      return;
    }

    const transactionRecord = await api.mirror.getTransactionRecord(
      formatTransactionIdToDashFormat(innerTransactionId),
    );

    const scheduledMirrorTx = transactionRecord.transactions.find(
      (tx) => tx.scheduled === true,
    );
    const accountId = scheduledMirrorTx?.entity_id;

    if (!accountId) {
      throw new StateError(
        'Could not resolve account ID from scheduled transaction record',
      );
    }

    const innerTransactionResult: TransactionResult =
      await api.receipt.getReceipt({
        transactionId: innerTransactionId,
      });

    const evmAddress = buildEvmAddressFromAccountId(accountId);

    if (normalisedParams.alias) {
      api.alias.register({
        alias: normalisedParams.alias,
        type: AliasType.Account,
        network: normalisedParams.network,
        entityId: accountId,
        evmAddress,
        publicKey: normalisedParams.publicKey,
        keyRefId: normalisedParams.keyRefId,
        createdAt: innerTransactionResult.consensusTimestamp,
      });
    }

    const accountData: AccountData = {
      name: normalisedParams.name,
      accountId,
      type: normalisedParams.keyType,
      publicKey: normalisedParams.publicKey,
      evmAddress,
      keyRefId: normalisedParams.keyRefId,
      network: normalisedParams.network,
    };
    const accountKey = composeKey(normalisedParams.network, accountId);
    const accountState = new ZustandAccountStateHelper(api.state, api.logger);
    accountState.saveAccount(accountKey, accountData);
  }
}

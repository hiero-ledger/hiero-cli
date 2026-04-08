import type { CommandHandlerArgs, CoreApi } from '@/core';
import type { CustomHandlerHookParams, HookResult } from '@/core/hooks/types';
import type { AccountData } from '@/plugins/account/schema';

import { formatTransactionIdToDashFormat, StateError } from '@/core';
import { AbstractHook } from '@/core/hooks/abstract-hook';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import {
  MirrorTransactionResult,
  type ScheduledData,
  type ScheduledDataVerifyResult,
} from '@/core/types/shared.types';
import { ACCOUNT_UPDATE_COMMAND_NAME } from '@/plugins/account/commands/update/handler';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

import { AccountUpdateNormalisedParamsSchema } from './types';

export class AccountUpdateScheduleStateHook extends AbstractHook {
  override async customHandlerHook(
    args: CommandHandlerArgs,
    params: CustomHandlerHookParams<ScheduledDataVerifyResult>,
  ): Promise<HookResult> {
    const { api } = args;
    const scheduledData = params.customHandlerParams.scheduledData;
    if (scheduledData.command !== ACCOUNT_UPDATE_COMMAND_NAME) {
      return Promise.resolve({
        breakFlow: false,
        result: {
          message: 'success',
        },
      });
    }
    try {
      await this.saveUpdatedAccount(api, scheduledData);
    } catch (error) {
      api.logger.error(
        `Error updating account state after scheduled execution: ${error instanceof Error ? error.message : String(error)}`,
      );
      return Promise.resolve({
        breakFlow: false,
        result: {
          message: 'error',
        },
      });
    }
    return Promise.resolve({
      breakFlow: false,
      result: {
        message: 'success',
      },
    });
  }

  private async saveUpdatedAccount(
    api: CoreApi,
    scheduledData: ScheduledData,
  ): Promise<void> {
    const parseResult = AccountUpdateNormalisedParamsSchema.safeParse(
      scheduledData.normalizedParams,
    );
    if (!parseResult.success) {
      api.logger.warn(
        `There was a problem with parsing account update data schema. The saving will not be done`,
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
    const result = scheduledMirrorTx?.result;
    if (result !== MirrorTransactionResult.SUCCESS) {
      throw new StateError(
        `Scheduled transaction result is not ${MirrorTransactionResult.SUCCESS}: ${result}`,
      );
    }

    const entityId = scheduledMirrorTx?.entity_id;
    if (entityId && entityId !== normalisedParams.accountId) {
      throw new StateError(
        `Account ID mismatch: expected ${normalisedParams.accountId}, got ${entityId}`,
      );
    }

    if (
      normalisedParams.newKeyRefId === undefined ||
      normalisedParams.newPublicKey === undefined
    ) {
      return;
    }

    const accountState = new ZustandAccountStateHelper(api.state, api.logger);
    const existingAccount = accountState.getAccount(
      normalisedParams.accountStateKey,
    );

    if (!existingAccount) {
      api.logger.warn(
        `Account '${normalisedParams.accountId}' not found in state after scheduled execution, skipping state update`,
      );
      return;
    }

    const updatedAccount: AccountData = {
      ...existingAccount,
      keyRefId: normalisedParams.newKeyRefId,
      publicKey: normalisedParams.newPublicKey,
      type: normalisedParams.newKeyType ?? existingAccount.type,
    };
    accountState.saveAccount(normalisedParams.accountStateKey, updatedAccount);

    const aliasesForAccount = api.alias
      .list({ network: normalisedParams.network, type: AliasType.Account })
      .filter((rec) => rec.entityId === normalisedParams.accountId);

    for (const rec of aliasesForAccount) {
      api.alias.remove(rec.alias, normalisedParams.network);
      api.alias.register({
        ...rec,
        publicKey: normalisedParams.newPublicKey,
        keyRefId: normalisedParams.newKeyRefId,
      });
    }
  }
}

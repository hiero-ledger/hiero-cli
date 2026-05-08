import type { CoreApi } from '@/core';
import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';
import type { AccountData } from '@/plugins/account/schema';
import type { BatchData } from '@/plugins/batch/schema';
import type { ScheduledTransactionData } from '@/plugins/schedule/schema';

import { formatTransactionIdToDashFormat } from '@/core';
import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import { AliasType } from '@/core/types/shared.types';
import {
  type BatchDataItem,
  MirrorTransactionResult,
  OrchestratorSource,
} from '@/core/types/shared.types';
import { ACCOUNT_UPDATE_COMMAND_NAME } from '@/plugins/account/commands/update/handler';
import {
  type AccountUpdateNormalisedParams,
  AccountUpdateNormalisedParamsSchema,
} from '@/plugins/account/hooks/account-update-state/types';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

export class AccountUpdateStateHook implements Hook<PostOutputPreparationHookParams> {
  async execute(params: PostOutputPreparationHookParams): Promise<HookResult> {
    const parsed = OrchestratorResultSchema.safeParse(
      params.executeTransactionResult,
    );
    if (!parsed.success) {
      return { breakFlow: false };
    }

    const { api } = params.args;

    switch (parsed.data.source) {
      case OrchestratorSource.BATCH:
        this.handleBatch(api, parsed.data.batchData);
        break;
      case OrchestratorSource.SCHEDULE:
        await this.handleSchedule(api, parsed.data.scheduledData);
        break;
      default:
        break;
    }

    return { breakFlow: false };
  }

  private handleBatch(api: CoreApi, batchData: BatchData): void {
    if (!batchData.success) {
      return;
    }
    for (const item of batchData.transactions) {
      if (item.command !== ACCOUNT_UPDATE_COMMAND_NAME) {
        continue;
      }
      this.updateFromBatchItem(api, item);
    }
  }

  private async handleSchedule(
    api: CoreApi,
    scheduledData: ScheduledTransactionData,
  ): Promise<void> {
    if (scheduledData.command !== ACCOUNT_UPDATE_COMMAND_NAME) {
      return;
    }
    await this.updateFromScheduled(api, scheduledData);
  }

  private updateFromBatchItem(
    api: CoreApi,
    batchDataItem: BatchDataItem,
  ): void {
    const normalisedParams = this.parseAccountUpdateParams(
      api,
      batchDataItem.normalizedParams,
    );
    if (!normalisedParams) {
      return;
    }

    this.persistAccountUpdate(api, normalisedParams);
  }

  private async updateFromScheduled(
    api: CoreApi,
    scheduledData: ScheduledTransactionData,
  ): Promise<void> {
    const normalisedParams = this.parseAccountUpdateParams(
      api,
      scheduledData.normalizedParams ?? {},
    );
    if (!normalisedParams) {
      return;
    }

    const innerTransactionId = scheduledData.transactionId;
    if (!innerTransactionId) {
      api.logger.warn(`No transaction ID found for scheduled transaction`);
      return;
    }

    const transactionRecord = await api.mirror.getTransactionRecord(
      formatTransactionIdToDashFormat(innerTransactionId),
    );

    const scheduledMirrorTx = transactionRecord.transactions.find(
      (tx) => tx.scheduled,
    );
    const result = scheduledMirrorTx?.result;
    if (result !== MirrorTransactionResult.SUCCESS) {
      api.logger.warn(
        `Scheduled transaction result is not ${MirrorTransactionResult.SUCCESS}: ${String(result)}, skipping state update`,
      );
      return;
    }

    const entityId = scheduledMirrorTx?.entity_id;
    if (entityId && entityId !== normalisedParams.accountId) {
      api.logger.warn(
        `Account ID mismatch: expected ${normalisedParams.accountId}, got ${entityId}, skipping state update`,
      );
      return;
    }

    this.persistAccountUpdate(api, normalisedParams);
  }

  private persistAccountUpdate(
    api: CoreApi,
    normalisedParams: AccountUpdateNormalisedParams,
  ): void {
    const {
      accountId,
      network,
      accountStateKey,
      newPublicKey,
      newKeyRefId,
      newKeyType,
    } = normalisedParams;

    if (!newKeyRefId || !newPublicKey) {
      return;
    }

    const accountState = new ZustandAccountStateHelper(api.state, api.logger);
    const existingAccount = accountState.getAccount(accountStateKey);

    if (!existingAccount) {
      api.logger.warn(
        `Account '${accountId}' not found in state, skipping state update`,
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

  private parseAccountUpdateParams(
    api: CoreApi,
    normalizedParams: unknown,
  ): AccountUpdateNormalisedParams | undefined {
    const parseResult =
      AccountUpdateNormalisedParamsSchema.safeParse(normalizedParams);
    if (!parseResult.success) {
      api.logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }
    return parseResult.data;
  }
}

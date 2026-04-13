import type { CoreApi, Logger } from '@/core';
import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PostOutputPreparationHookParams } from '@/core/hooks/types';
import type { AccountData } from '@/plugins/account/schema';
import type { BatchData } from '@/plugins/batch/schema';
import type { ScheduledTransactionData } from '@/plugins/schedule/schema';

import { formatTransactionIdToDashFormat, StateError } from '@/core';
import { OrchestratorResultSchema } from '@/core/hooks/orchestrator-result';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import {
  type BatchDataItem,
  MirrorTransactionResult,
  OrchestratorSource,
} from '@/core/types/shared.types';
import { ACCOUNT_UPDATE_COMMAND_NAME } from '@/plugins/account/commands/update/handler';
import { AccountUpdateNormalisedParamsSchema } from '@/plugins/account/hooks/account-update-state/types';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

export class AccountUpdateStateHook implements Hook<PostOutputPreparationHookParams> {
  async execute(params: PostOutputPreparationHookParams): Promise<HookResult> {
    const parsed = OrchestratorResultSchema.safeParse(
      params.executeTransactionResult,
    );
    if (!parsed.success) {
      return { breakFlow: false };
    }

    const { api, logger } = params.args;

    switch (parsed.data.source) {
      case OrchestratorSource.BATCH:
        this.handleBatch(api, logger, parsed.data.batchData);
        break;
      case OrchestratorSource.SCHEDULE:
        await this.handleSchedule(api, parsed.data.scheduledData);
        break;
      default:
        break;
    }

    return { breakFlow: false };
  }

  private handleBatch(
    api: CoreApi,
    logger: Logger,
    batchData: BatchData,
  ): void {
    if (!batchData.success) {
      return;
    }
    for (const item of batchData.transactions) {
      if (item.command !== ACCOUNT_UPDATE_COMMAND_NAME) {
        continue;
      }
      this.updateAccountStateFromBatchItem(api, logger, item);
    }
  }

  private async handleSchedule(
    api: CoreApi,
    scheduledData: ScheduledTransactionData,
  ): Promise<void> {
    if (scheduledData.command !== ACCOUNT_UPDATE_COMMAND_NAME) {
      return;
    }
    try {
      await this.saveUpdatedAccount(api, scheduledData);
    } catch (error) {
      api.logger.error(
        `Error updating account state after scheduled execution: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private updateAccountStateFromBatchItem(
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

  private async saveUpdatedAccount(
    api: CoreApi,
    scheduledData: ScheduledTransactionData,
  ): Promise<void> {
    const parseResult = AccountUpdateNormalisedParamsSchema.safeParse(
      scheduledData.normalizedParams ?? {},
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

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

    const { api, logger } = params.args;

    switch (parsed.data.source) {
      case OrchestratorSource.BATCH:
        this.handleBatch(api, logger, parsed.data.batchData);
        break;
      case OrchestratorSource.SCHEDULE:
        await this.handleSchedule(api, logger, parsed.data.scheduledData);
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
      this.updateFromBatchItem(api, logger, item);
    }
  }

  private async handleSchedule(
    api: CoreApi,
    logger: Logger,
    scheduledData: ScheduledTransactionData,
  ): Promise<void> {
    if (scheduledData.command !== ACCOUNT_UPDATE_COMMAND_NAME) {
      return;
    }
    await this.updateFromScheduled(api, logger, scheduledData);
  }

  private updateFromBatchItem(
    api: CoreApi,
    logger: Logger,
    batchDataItem: BatchDataItem,
  ): void {
    const normalisedParams = this.parseAccountUpdateParams(
      logger,
      batchDataItem.normalizedParams,
    );
    if (!normalisedParams) {
      return;
    }

    this.persistAccountUpdate(api, logger, normalisedParams);
  }

  private async updateFromScheduled(
    api: CoreApi,
    logger: Logger,
    scheduledData: ScheduledTransactionData,
  ): Promise<void> {
    const normalisedParams = this.parseAccountUpdateParams(
      logger,
      scheduledData.normalizedParams ?? {},
    );
    if (!normalisedParams) {
      return;
    }

    const innerTransactionId = scheduledData.transactionId;
    if (!innerTransactionId) {
      logger.warn(`No transaction ID found for scheduled transaction`);
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

    this.persistAccountUpdate(api, logger, normalisedParams);
  }

  private persistAccountUpdate(
    api: CoreApi,
    logger: Logger,
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

    const accountState = new ZustandAccountStateHelper(api.state, logger);
    const existingAccount = accountState.getAccount(accountStateKey);

    if (!existingAccount) {
      logger.warn(
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
    logger: Logger,
    normalizedParams: unknown,
  ): AccountUpdateNormalisedParams | undefined {
    const parseResult =
      AccountUpdateNormalisedParamsSchema.safeParse(normalizedParams);
    if (!parseResult.success) {
      logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }
    return parseResult.data;
  }
}

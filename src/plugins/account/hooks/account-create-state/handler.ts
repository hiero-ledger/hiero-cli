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
  OrchestratorSource,
  type TransactionResult,
} from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { ACCOUNT_CREATE_COMMAND_NAME } from '@/plugins/account/commands/create';
import { AccountCreateNormalisedParamsSchema } from '@/plugins/account/hooks/account-create-state/types';
import { buildEvmAddressFromAccountId } from '@/plugins/account/utils/account-address';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

export class AccountCreateStateHook implements Hook<PostOutputPreparationHookParams> {
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
        await this.handleBatch(api, logger, parsed.data.batchData);
        break;
      case OrchestratorSource.SCHEDULE:
        await this.handleSchedule(api, logger, parsed.data.scheduledData);
        break;
      default:
        break;
    }

    return { breakFlow: false };
  }

  private async handleBatch(
    api: CoreApi,
    logger: Logger,
    batchData: BatchData,
  ): Promise<void> {
    if (!batchData.success) {
      return;
    }
    for (const item of batchData.transactions) {
      if (item.command !== ACCOUNT_CREATE_COMMAND_NAME) {
        continue;
      }
      await this.saveFromBatchItem(api, logger, item);
    }
  }

  private async handleSchedule(
    api: CoreApi,
    logger: Logger,
    scheduledData: ScheduledTransactionData,
  ): Promise<void> {
    if (scheduledData.command !== ACCOUNT_CREATE_COMMAND_NAME) {
      return;
    }
    await this.saveFromScheduled(api, logger, scheduledData);
  }

  private async saveFromBatchItem(
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
      if (api.alias.exists(normalisedParams.alias, normalisedParams.network)) {
        logger.warn(
          `Alias "${normalisedParams.alias}" already exists, skipping registration`,
        );
      } else {
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

  private async saveFromScheduled(
    api: CoreApi,
    logger: Logger,
    scheduledData: ScheduledTransactionData,
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
      (tx) => tx.scheduled,
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
      if (api.alias.exists(normalisedParams.alias, normalisedParams.network)) {
        logger.warn(
          `Alias "${normalisedParams.alias}" already exists, skipping registration`,
        );
      } else {
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
    const accountState = new ZustandAccountStateHelper(api.state, logger);
    accountState.saveAccount(accountKey, accountData);
  }
}

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
import {
  type AccountCreateNormalisedParams,
  AccountCreateNormalisedParamsSchema,
} from '@/plugins/account/hooks/account-create-state/types';
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
    const normalisedParams = this.parseAccountCreateParams(
      logger,
      batchDataItem.normalizedParams,
    );
    if (!normalisedParams) {
      return;
    }

    const innerTransactionId = batchDataItem.transactionId;
    if (!innerTransactionId) {
      logger.warn(
        `No transaction ID found for batch transaction ${batchDataItem.order}`,
      );
      return;
    }

    const receipt: TransactionResult = await api.receipt.getReceipt({
      transactionId: innerTransactionId,
    });

    if (!receipt.accountId) {
      throw new StateError(
        'Transaction completed but did not return an account ID, unable to derive addresses',
      );
    }

    this.persistAccountCreate(api, logger, normalisedParams, {
      stateAccountId: receipt.accountId,
      receipt,
    });
  }

  private async saveFromScheduled(
    api: CoreApi,
    logger: Logger,
    scheduledData: ScheduledTransactionData,
  ): Promise<void> {
    const normalisedParams = this.parseAccountCreateParams(
      logger,
      scheduledData.normalizedParams,
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
    const accountId = scheduledMirrorTx?.entity_id;

    if (!accountId) {
      throw new StateError(
        'Could not resolve account ID from scheduled transaction record',
      );
    }

    const receipt: TransactionResult = await api.receipt.getReceipt({
      transactionId: innerTransactionId,
    });

    this.persistAccountCreate(api, logger, normalisedParams, {
      stateAccountId: accountId,
      receipt,
    });
  }

  private persistAccountCreate(
    api: CoreApi,
    logger: Logger,
    normalisedParams: AccountCreateNormalisedParams,
    resolved: {
      stateAccountId: string;
      receipt: TransactionResult;
    },
  ): void {
    const { stateAccountId, receipt } = resolved;
    const evmAddress = buildEvmAddressFromAccountId(stateAccountId);

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
          entityId: stateAccountId,
          evmAddress,
          publicKey: normalisedParams.publicKey,
          keyRefId: normalisedParams.keyRefId,
          createdAt: receipt.consensusTimestamp,
        });
      }
    }

    const accountData: AccountData = {
      name: normalisedParams.name,
      accountId: stateAccountId,
      type: normalisedParams.keyType,
      publicKey: normalisedParams.publicKey,
      evmAddress,
      keyRefId: normalisedParams.keyRefId,
      network: normalisedParams.network,
    };
    const accountKey = composeKey(normalisedParams.network, stateAccountId);
    const accountState = new ZustandAccountStateHelper(api.state, logger);
    accountState.saveAccount(accountKey, accountData);
  }

  private parseAccountCreateParams(
    logger: Logger,
    normalizedParams: unknown,
  ): AccountCreateNormalisedParams | undefined {
    const parseResult =
      AccountCreateNormalisedParamsSchema.safeParse(normalizedParams);
    if (!parseResult.success) {
      logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return;
    }
    return parseResult.data;
  }
}

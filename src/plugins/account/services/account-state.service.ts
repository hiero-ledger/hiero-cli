import type {
  AliasService,
  KmsService,
  Logger,
  NetworkService,
  StateService,
} from '@/core';
import type { HederaMirrornodeService } from '@/core/services/mirrornode/hedera-mirrornode-service.interface';
import type { ReceiptService } from '@/core/services/receipt/receipt-service.interface';
import type {
  BatchDataItem,
  TransactionResult,
} from '@/core/types/shared.types';
import type { AccountUpdateNormalisedParams } from '@/plugins/account/hooks/account-update-state/types';
import type {
  AccountData,
  AccountData as AccountDataType,
} from '@/plugins/account/schema';
import type { AccountStateService } from '@/plugins/account/services/account-state.service.interface';
import type { ScheduledTransactionData } from '@/plugins/schedule/schema';

import { formatTransactionIdToDashFormat } from '@/core';
import { ValidationError } from '@/core/errors';
import { AliasType, MirrorTransactionResult } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { ACCOUNT_CREATE_COMMAND_NAME } from '@/plugins/account/commands/create';
import { ACCOUNT_DELETE_COMMAND_NAME } from '@/plugins/account/commands/delete/handler';
import { ACCOUNT_UPDATE_COMMAND_NAME } from '@/plugins/account/commands/update/handler';
import { ACCOUNT_NAMESPACE } from '@/plugins/account/constants';
import {
  type AccountCreateNormalisedParams,
  AccountCreateNormalisedParamsSchema,
} from '@/plugins/account/hooks/account-create-state/types';
import { AccountDeleteNormalisedParamsSchema } from '@/plugins/account/hooks/account-delete-state/types';
import { AccountUpdateNormalisedParamsSchema } from '@/plugins/account/hooks/account-update-state/types';
import { safeParseAccountData } from '@/plugins/account/schema';
import { buildEvmAddressFromAccountId } from '@/plugins/account/utils/account-address';

export class AccountStateServiceImpl implements AccountStateService {
  private readonly namespace = ACCOUNT_NAMESPACE;

  constructor(
    private readonly state: StateService,
    private readonly logger: Logger,
    private readonly receipt: ReceiptService,
    private readonly mirror: HederaMirrornodeService,
    private readonly alias: AliasService,
    private readonly kms: KmsService,
    private readonly network: NetworkService,
  ) {}

  saveAccount(key: string, accountData: AccountData): void {
    this.logger.debug(`[ACCOUNT STATE] Saving account: ${key}`);

    const validation = safeParseAccountData(accountData);
    if (!validation.success) {
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new ValidationError(`Invalid account data: ${errors}`);
    }

    this.state.set(this.namespace, key, accountData);
    this.logger.debug(`[ACCOUNT STATE] Account saved: ${key}`);
  }

  getAccount(key: string): AccountData | null {
    this.logger.debug(`[ACCOUNT STATE] Loading account: ${key}`);
    const data = this.state.get<AccountData>(this.namespace, key);
    if (!data) return null;

    const validation = safeParseAccountData(data);
    if (!validation.success) {
      this.logger.warn(
        `[ACCOUNT STATE] Invalid data for account: ${key}. Errors: ${validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      );
      return null;
    }
    return data;
  }

  listAccounts(): AccountData[] {
    this.logger.debug('[ACCOUNT STATE] Listing all accounts');
    const allData = this.state.list<AccountData>(this.namespace);
    return allData.filter((data) => safeParseAccountData(data).success);
  }

  deleteAccount(key: string): void {
    this.logger.debug(`[ACCOUNT STATE] Deleting account: ${key}`);
    this.state.delete(this.namespace, key);
  }

  clearAccounts(): void {
    this.logger.debug('[ACCOUNT STATE] Clearing all accounts');
    this.state.clear(this.namespace);
  }

  hasAccount(key: string): boolean {
    this.logger.debug(`[ACCOUNT STATE] Checking if account exists: ${key}`);
    return this.state.has(this.namespace, key);
  }

  async applyAccountCreateFromBatchItem(item: BatchDataItem): Promise<void> {
    if (item.command !== ACCOUNT_CREATE_COMMAND_NAME) return;
    const params = this.parseCreateParams(item.normalizedParams);
    if (!params) return;

    const transactionId = item.transactionId;
    if (!transactionId) {
      this.logger.warn(
        `No transaction ID found for batch transaction ${item.order}`,
      );
      return;
    }

    const receipt: TransactionResult = await this.receipt.getReceipt({
      transactionId,
    });
    if (!receipt.accountId) {
      this.logger.warn(
        'Transaction completed but did not return an account ID, skipping state save',
      );
      return;
    }

    this.persistAccountCreate(params, {
      stateAccountId: receipt.accountId,
      consensusTimestamp: receipt.consensusTimestamp,
    });
  }

  async applyAccountCreateFromSchedule(
    data: ScheduledTransactionData,
  ): Promise<void> {
    if (data.command !== ACCOUNT_CREATE_COMMAND_NAME) return;
    const params = this.parseCreateParams(data.normalizedParams);
    if (!params) return;

    const transactionId = data.transactionId;
    if (!transactionId) {
      this.logger.warn(`No transaction ID found for scheduled transaction`);
      return;
    }

    const transactionRecord = await this.mirror.getTransactionRecord(
      formatTransactionIdToDashFormat(transactionId),
    );
    const scheduledMirrorTx = transactionRecord.transactions.find(
      (tx) => tx.scheduled,
    );
    const accountId = scheduledMirrorTx?.entity_id;
    if (!accountId) {
      this.logger.warn(
        'Could not resolve account ID from scheduled transaction record, skipping state save',
      );
      return;
    }

    this.persistAccountCreate(params, {
      stateAccountId: accountId,
      consensusTimestamp: scheduledMirrorTx?.consensus_timestamp,
    });
  }

  applyAccountUpdateFromBatchItem(item: BatchDataItem): Promise<void> {
    if (item.command !== ACCOUNT_UPDATE_COMMAND_NAME) return Promise.resolve();
    const params = this.parseUpdateParams(item.normalizedParams);
    if (!params) return Promise.resolve();
    this.persistAccountUpdate(params);
    return Promise.resolve();
  }

  async applyAccountUpdateFromSchedule(
    data: ScheduledTransactionData,
  ): Promise<void> {
    if (data.command !== ACCOUNT_UPDATE_COMMAND_NAME) return;
    const params = this.parseUpdateParams(data.normalizedParams ?? {});
    if (!params) return;

    const transactionId = data.transactionId;
    if (!transactionId) {
      this.logger.warn(`No transaction ID found for scheduled transaction`);
      return;
    }

    const transactionRecord = await this.mirror.getTransactionRecord(
      formatTransactionIdToDashFormat(transactionId),
    );
    const scheduledMirrorTx = transactionRecord.transactions.find(
      (tx) => tx.scheduled,
    );
    const result = scheduledMirrorTx?.result;
    if (result !== MirrorTransactionResult.SUCCESS) {
      this.logger.warn(
        `Scheduled transaction result is not ${MirrorTransactionResult.SUCCESS}: ${String(result)}, skipping state update`,
      );
      return;
    }

    const entityId = scheduledMirrorTx?.entity_id;
    if (entityId && entityId !== params.accountId) {
      this.logger.warn(
        `Account ID mismatch: expected ${params.accountId}, got ${entityId}, skipping state update`,
      );
      return;
    }

    this.persistAccountUpdate(params);
  }

  applyAccountDeleteFromBatchItem(item: BatchDataItem): Promise<void> {
    if (item.command !== ACCOUNT_DELETE_COMMAND_NAME) return Promise.resolve();
    const parsed = AccountDeleteNormalisedParamsSchema.safeParse(
      item.normalizedParams,
    );
    if (!parsed.success) {
      this.logger.warn(
        'Account delete batch state hook: normalized params did not match schema; skipping local state cleanup',
      );
      return Promise.resolve();
    }
    const params = parsed.data;
    this.removeAccountFromLocalState(
      params.accountToDelete.accountId,
      params.network,
    );
    this.removeKmsCredentialIfUnused(params.accountToDelete.keyRefId);
    return Promise.resolve();
  }

  private parseCreateParams(
    normalizedParams: unknown,
  ): AccountCreateNormalisedParams | undefined {
    const parsed =
      AccountCreateNormalisedParamsSchema.safeParse(normalizedParams);
    if (!parsed.success) {
      this.logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return undefined;
    }
    return parsed.data;
  }

  private parseUpdateParams(
    normalizedParams: unknown,
  ): AccountUpdateNormalisedParams | undefined {
    const parsed =
      AccountUpdateNormalisedParamsSchema.safeParse(normalizedParams);
    if (!parsed.success) {
      this.logger.warn(
        `There was a problem with parsing data schema. The saving will not be done`,
      );
      return undefined;
    }
    return parsed.data;
  }

  private persistAccountCreate(
    params: AccountCreateNormalisedParams,
    resolved: { stateAccountId: string; consensusTimestamp?: string },
  ): void {
    const { stateAccountId, consensusTimestamp } = resolved;
    const evmAddress = buildEvmAddressFromAccountId(stateAccountId);

    if (params.alias) {
      if (this.alias.exists(params.alias, params.network)) {
        this.logger.warn(
          `Alias "${params.alias}" already exists, skipping registration`,
        );
      } else {
        this.alias.register({
          alias: params.alias,
          type: AliasType.Account,
          network: params.network,
          entityId: stateAccountId,
          evmAddress,
          publicKey: params.publicKey,
          keyRefId: params.keyRefId,
          createdAt: consensusTimestamp ?? new Date().toISOString(),
        });
      }
    }

    const accountData: AccountDataType = {
      name: params.name,
      accountId: stateAccountId,
      type: params.keyType,
      publicKey: params.publicKey,
      evmAddress,
      keyRefId: params.keyRefId,
      network: params.network,
    };
    const accountKey = composeKey(params.network, stateAccountId);
    this.saveAccount(accountKey, accountData);
  }

  private persistAccountUpdate(params: AccountUpdateNormalisedParams): void {
    const {
      accountId,
      network,
      accountStateKey,
      newPublicKey,
      newKeyRefId,
      newKeyType,
    } = params;

    if (!newKeyRefId || !newPublicKey) return;

    const existing = this.getAccount(accountStateKey);
    if (!existing) {
      this.logger.warn(
        `Account '${accountId}' not found in state, skipping state update`,
      );
      return;
    }

    const updated: AccountDataType = {
      ...existing,
      keyRefId: newKeyRefId,
      publicKey: newPublicKey,
      type: newKeyType ?? existing.type,
    };

    this.saveAccount(accountStateKey, updated);

    const aliasesForAccount = this.alias
      .list({ network, type: AliasType.Account })
      .filter((rec) => rec.entityId === accountId);

    for (const rec of aliasesForAccount) {
      this.alias.remove(rec.alias, network);
      this.alias.register({
        ...rec,
        publicKey: newPublicKey,
        keyRefId: newKeyRefId,
      });
    }
  }

  private removeAccountFromLocalState(
    accountId: string,
    network: AccountUpdateNormalisedParams['network'],
  ): void {
    const key = composeKey(network, accountId);
    const aliasesForAccount = this.alias
      .list({ network, type: AliasType.Account })
      .filter((rec) => rec.entityId === accountId);

    for (const rec of aliasesForAccount) {
      this.alias.remove(rec.alias, network);
      this.logger.info(`Removed alias '${rec.alias}' on ${network}`);
    }

    this.deleteAccount(key);
  }

  private removeKmsCredentialIfUnused(keyRefId: string): void {
    const otherAccountsWithSameKey = this.listAccounts().filter(
      (acc) => acc.keyRefId === keyRefId,
    );
    if (otherAccountsWithSameKey.length > 0) return;

    const operator = this.network.getCurrentOperatorOrThrow();
    if (operator.keyRefId === keyRefId) return;

    this.kms.remove(keyRefId);
  }
}

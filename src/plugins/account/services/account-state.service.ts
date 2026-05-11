import type { Logger, StateService } from '@/core';
import type { AccountStateService } from '@/plugins/account/services/account-state.service.interface';

import { ValidationError } from '@/core/errors';
import { ACCOUNT_NAMESPACE } from '@/plugins/account/constants';
import {
  type AccountData,
  safeParseAccountData,
} from '@/plugins/account/schema';

export class AccountStateServiceImpl implements AccountStateService {
  private readonly namespace = ACCOUNT_NAMESPACE;

  constructor(
    private readonly state: StateService,
    private readonly logger: Logger,
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

    if (!data) {
      return null;
    }

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
}

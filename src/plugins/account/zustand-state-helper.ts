/**
 * Zustand-based Account State Helper
 * Provides rich state management with subscriptions and actions
 */
import type { Logger, StateService } from '@/core';

import { ValidationError } from '@/core/errors';

import { ACCOUNT_NAMESPACE } from './manifest';
import { type AccountData, safeParseAccountData } from './schema';

export class ZustandAccountStateHelper {
  private state: StateService;
  private logger: Logger;
  private namespace: string;

  constructor(state: StateService, logger: Logger) {
    this.state = state;
    this.logger = logger;
    this.namespace = ACCOUNT_NAMESPACE;
  }

  /**
   * Save account with validation
   */
  saveAccount(key: string, accountData: AccountData): void {
    this.logger.debug(`[ZUSTAND ACCOUNT STATE] Saving account: ${key}`);

    const validation = safeParseAccountData(accountData);
    if (!validation.success) {
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new ValidationError(`Invalid account data: ${errors}`);
    }

    this.state.set(this.namespace, key, accountData);
    this.logger.debug(`[ZUSTAND ACCOUNT STATE] Account saved: ${key}`);
  }

  /**
   * Load account with validation
   */
  getAccount(key: string): AccountData | null {
    this.logger.debug(`[ZUSTAND ACCOUNT STATE] Loading account: ${key}`);
    const data = this.state.get<AccountData>(this.namespace, key);

    if (data) {
      const validation = safeParseAccountData(data);
      if (!validation.success) {
        this.logger.warn(
          `[ZUSTAND ACCOUNT STATE] Invalid data for account: ${key}. Errors: ${validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        );
        return null;
      }
    }

    return data || null;
  }

  /**
   * List all accounts with validation
   */
  listAccounts(): AccountData[] {
    this.logger.debug(`[ZUSTAND ACCOUNT STATE] Listing all accounts`);
    const allData = this.state.list<AccountData>(this.namespace);
    return allData.filter((data) => safeParseAccountData(data).success);
  }

  /**
   * Delete account
   */
  deleteAccount(key: string): void {
    this.logger.debug(`[ZUSTAND ACCOUNT STATE] Deleting account: ${key}`);
    this.state.delete(this.namespace, key);
  }

  /**
   * Clear all accounts
   */
  clearAccounts(): void {
    this.logger.debug(`[ZUSTAND ACCOUNT STATE] Clearing all accounts`);
    this.state.clear(this.namespace);
  }

  /**
   * Check if account exists by name
   */
  hasAccount(key: string): boolean {
    this.logger.debug(
      `[ZUSTAND ACCOUNT STATE] Checking if account exists: ${key}`,
    );
    return this.state.has(this.namespace, key);
  }
}

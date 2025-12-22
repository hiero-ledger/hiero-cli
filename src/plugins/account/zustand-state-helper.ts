/**
 * Zustand-based Account State Helper
 * Provides rich state management with subscriptions and actions
 */
import type { Logger, StateService } from '@/core';
import type { KeyAlgorithm } from '@/core/shared/constants';

import {
  ACCOUNT_NAMESPACE,
  type AccountData,
  safeParseAccountData,
} from './schema';

export class ZustandAccountStateHelper {
  private state: StateService;
  private logger: Logger;
  private namespace: string;
  private unsubscribe?: () => void;

  constructor(state: StateService, logger: Logger) {
    this.state = state;
    this.logger = logger;
    this.namespace = ACCOUNT_NAMESPACE;
  }

  /**
   * Save account with validation
   */
  saveAccount(name: string, accountData: AccountData): void {
    this.logger.debug(`[ZUSTAND ACCOUNT STATE] Saving account: ${name}`);

    const validation = safeParseAccountData(accountData);
    if (!validation.success) {
      const errors = validation.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new Error(`Invalid account data: ${errors}`);
    }

    this.state.set(this.namespace, name, accountData);
    this.logger.debug(`[ZUSTAND ACCOUNT STATE] Account saved: ${name}`);
  }

  /**
   * Load account with validation
   */
  loadAccount(name: string): AccountData | null {
    this.logger.debug(`[ZUSTAND ACCOUNT STATE] Loading account: ${name}`);
    const data = this.state.get<AccountData>(this.namespace, name);

    if (data) {
      const validation = safeParseAccountData(data);
      if (!validation.success) {
        this.logger.warn(
          `[ZUSTAND ACCOUNT STATE] Invalid data for account: ${name}. Errors: ${validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
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
  deleteAccount(name: string): void {
    this.logger.debug(`[ZUSTAND ACCOUNT STATE] Deleting account: ${name}`);
    this.state.delete(this.namespace, name);
  }

  /**
   * Clear all accounts
   */
  clearAccounts(): void {
    this.logger.debug(`[ZUSTAND ACCOUNT STATE] Clearing all accounts`);
    this.state.clear(this.namespace);
  }

  /**
   * Check if account exists
   */
  hasAccount(name: string): boolean {
    this.logger.debug(
      `[ZUSTAND ACCOUNT STATE] Checking if account exists: ${name}`,
    );
    return this.state.has(this.namespace, name);
  }

  /**
   * Get account count
   */
  getAccountCount(): number {
    const accounts = this.listAccounts();
    return accounts.length;
  }

  /**
   * Get accounts by network
   */
  getAccountsByNetwork(network: string): AccountData[] {
    const accounts = this.listAccounts();
    return accounts.filter((account) => account.network === network);
  }

  /**
   * Get accounts by type
   */
  getAccountsByType(type: KeyAlgorithm): AccountData[] {
    const accounts = this.listAccounts();
    return accounts.filter((account) => account.type === type);
  }

  /**
   * Subscribe to account changes
   */
  subscribeToAccounts(callback: (accounts: AccountData[]) => void): () => void {
    this.logger.debug(`[ZUSTAND ACCOUNT STATE] Subscribing to account changes`);

    this.unsubscribe = this.state.subscribe<AccountData>(
      this.namespace,
      (data) => {
        const validAccounts = data.filter(
          (account) => safeParseAccountData(account).success,
        );
        callback(validAccounts);
      },
    );

    return () => {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.logger.debug(
          `[ZUSTAND ACCOUNT STATE] Unsubscribed from account changes`,
        );
      }
    };
  }

  /**
   * Get Zustand store actions for advanced usage
   */
  getStoreActions(): unknown {
    return this.state.getActions(this.namespace);
  }

  /**
   * Get Zustand store state for advanced usage
   */
  getStoreState(): unknown {
    return this.state.getState(this.namespace);
  }

  /**
   * Get all keys in the namespace
   */
  getAccountNames(): string[] {
    return this.state.getKeys(this.namespace);
  }

  /**
   * Batch operations
   */
  batchSaveAccounts(
    accounts: Array<{ name: string; data: AccountData }>,
  ): void {
    this.logger.debug(
      `[ZUSTAND ACCOUNT STATE] Batch saving ${accounts.length} accounts`,
    );

    for (const { name, data } of accounts) {
      this.saveAccount(name, data);
    }
  }

  /**
   * Batch delete accounts
   */
  batchDeleteAccounts(names: string[]): void {
    this.logger.debug(
      `[ZUSTAND ACCOUNT STATE] Batch deleting ${names.length} accounts`,
    );

    for (const name of names) {
      this.deleteAccount(name);
    }
  }

  /**
   * Search accounts by criteria
   */
  searchAccounts(criteria: {
    network?: string;
    type?: KeyAlgorithm;
    namePattern?: string;
  }): AccountData[] {
    let accounts = this.listAccounts();

    if (criteria.network) {
      accounts = accounts.filter(
        (account) => account.network === criteria.network,
      );
    }

    if (criteria.type) {
      accounts = accounts.filter((account) => account.type === criteria.type);
    }

    if (criteria.namePattern) {
      const pattern = new RegExp(criteria.namePattern, 'i');
      accounts = accounts.filter((account) => pattern.test(account.name));
    }

    return accounts;
  }

  /**
   * Get account statistics
   */
  getAccountStats(): {
    total: number;
    byNetwork: Record<string, number>;
    byType: Record<string, number>;
  } {
    const accounts = this.listAccounts();

    const stats = {
      total: accounts.length,
      byNetwork: {} as Record<string, number>,
      byType: {} as Record<string, number>,
    };

    for (const account of accounts) {
      stats.byNetwork[account.network] =
        (stats.byNetwork[account.network] || 0) + 1;
      stats.byType[account.type] = (stats.byType[account.type] || 0) + 1;
    }

    return stats;
  }
}

import type { AccountData } from '@/plugins/account/schema';

export interface AccountStateService {
  saveAccount(key: string, accountData: AccountData): void;
  getAccount(key: string): AccountData | null;
  listAccounts(): AccountData[];
  deleteAccount(key: string): void;
  clearAccounts(): void;
  hasAccount(key: string): boolean;
}

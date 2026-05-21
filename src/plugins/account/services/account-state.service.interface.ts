import type { BatchDataItem } from '@/core/types/shared.types';
import type { AccountData } from '@/plugins/account/schema';
import type { ScheduledTransactionData } from '@/plugins/schedule/schema';

export interface AccountStateService {
  saveAccount(key: string, accountData: AccountData): void;
  getAccount(key: string): AccountData | null;
  listAccounts(): AccountData[];
  deleteAccount(key: string): void;
  clearAccounts(): void;
  hasAccount(key: string): boolean;

  applyAccountCreateFromBatchItem(item: BatchDataItem): Promise<void>;
  applyAccountCreateFromSchedule(data: ScheduledTransactionData): Promise<void>;
  applyAccountUpdateFromBatchItem(item: BatchDataItem): Promise<void>;
  applyAccountUpdateFromSchedule(data: ScheduledTransactionData): Promise<void>;
  applyAccountDeleteFromBatchItem(item: BatchDataItem): Promise<void>;
}

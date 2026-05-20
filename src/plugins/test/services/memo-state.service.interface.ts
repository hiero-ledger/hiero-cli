import type { MemoData } from '@/plugins/test/schema';

export interface MemoStateService {
  saveMemo(accountId: string, memoData: MemoData): void;
  getMemo(account: string): MemoData | null;
}

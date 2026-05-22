import type { ScheduledTransactionData } from '@/plugins/schedule/schema';

export interface ScheduleStateService {
  saveScheduled(key: string, data: ScheduledTransactionData): void;
  getScheduled(key: string): ScheduledTransactionData | null;
  listScheduled(): ScheduledTransactionData[];
  hasScheduled(key: string): boolean;
  deleteScheduled(key: string): void;
}

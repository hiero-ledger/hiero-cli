import type { BatchData } from '@/plugins/batch/schema';

export interface BatchStateService {
  saveBatch(key: string, batchData: BatchData): void;
  getBatch(key: string): BatchData | null;
  listBatches(): BatchData[];
  hasBatch(key: string): boolean;
  deleteBatch(key: string): void;
}

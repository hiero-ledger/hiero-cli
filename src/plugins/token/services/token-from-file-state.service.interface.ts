import type { BatchDataItem } from '@/core/types/shared.types';

export interface TokenFromFileStateService {
  applyCreateFtFromFileFromBatchItem(item: BatchDataItem): Promise<void>;
  applyCreateNftFromFileFromBatchItem(item: BatchDataItem): Promise<void>;
}

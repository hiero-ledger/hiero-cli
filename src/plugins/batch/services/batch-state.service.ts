import type { Logger, StateService } from '@/core';
import type { BatchStateService as IBatchStateService } from './batch-state.service.interface';

import { ValidationError } from '@/core/errors';
import { BATCH_NAMESPACE } from '@/plugins/batch/constants';
import { type BatchData, safeParseBatchData } from '@/plugins/batch/schema';

export class BatchStateServiceImpl implements IBatchStateService {
  private readonly namespace = BATCH_NAMESPACE;

  constructor(
    private readonly state: StateService,
    private readonly logger: Logger,
  ) {}

  saveBatch(key: string, batchData: BatchData): void {
    this.logger.debug(`[BATCH STATE] Saving batch: ${key}`);
    const validation = safeParseBatchData(batchData);
    if (!validation.success) {
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new ValidationError(`Invalid batch data: ${errors}`);
    }
    this.state.set(this.namespace, key, batchData);
    this.logger.debug(`[BATCH STATE] Batch saved: ${key}`);
  }

  getBatch(key: string): BatchData | null {
    this.logger.debug(`[BATCH STATE] Loading batch: ${key}`);
    const data = this.state.get<BatchData>(this.namespace, key);
    if (data) {
      const validation = safeParseBatchData(data);
      if (!validation.success) {
        this.logger.warn(
          `[BATCH STATE] Invalid data for batch: ${key}. Errors: ${validation.error.issues
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join(', ')}`,
        );
        return null;
      }
    }
    return data || null;
  }

  listBatches(): BatchData[] {
    this.logger.debug(`[BATCH STATE] Listing all batches`);
    const allData = this.state.list<BatchData>(this.namespace);
    return allData.filter((data) => safeParseBatchData(data).success);
  }

  hasBatch(key: string): boolean {
    this.logger.debug(`[BATCH STATE] Checking if batch exists: ${key}`);
    return this.state.has(this.namespace, key);
  }

  deleteBatch(key: string): void {
    this.logger.debug(`[BATCH STATE] Deleting batch: ${key}`);
    this.state.delete(this.namespace, key);
  }
}

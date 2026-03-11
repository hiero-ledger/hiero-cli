/**
 * Zustand-based Batch State Helper
 * Provides rich state management for batch data
 */
import type { Logger, StateService } from '@/core';

import { ValidationError } from '@/core/errors';

import { BATCH_NAMESPACE } from './manifest';
import { type BatchData, safeParseBatchData } from './schema';

export class ZustandBatchStateHelper {
  private state: StateService;
  private logger: Logger;
  private namespace: string;

  constructor(state: StateService, logger: Logger) {
    this.state = state;
    this.logger = logger;
    this.namespace = BATCH_NAMESPACE;
  }

  /**
   * Save batch with validation
   */
  saveBatch(key: string, batchData: BatchData): void {
    this.logger.debug(`[ZUSTAND BATCH STATE] Saving batch: ${key}`);

    const validation = safeParseBatchData(batchData);
    if (!validation.success) {
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new ValidationError(`Invalid batch data: ${errors}`);
    }

    this.state.set(this.namespace, key, batchData);
    this.logger.debug(`[ZUSTAND BATCH STATE] Batch saved: ${key}`);
  }

  /**
   * Load batch with validation
   */
  getBatch(key: string): BatchData | null {
    this.logger.debug(`[ZUSTAND BATCH STATE] Loading batch: ${key}`);
    const data = this.state.get<BatchData>(this.namespace, key);

    if (data) {
      const validation = safeParseBatchData(data);
      if (!validation.success) {
        this.logger.warn(
          `[ZUSTAND BATCH STATE] Invalid data for batch: ${key}. Errors: ${validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        );
        return null;
      }
    }

    return data || null;
  }

  /**
   * List all batches with validation
   */
  listBatches(): BatchData[] {
    this.logger.debug(`[ZUSTAND BATCH STATE] Listing all batches`);
    const allData = this.state.list<BatchData>(this.namespace);
    return allData.filter((data) => safeParseBatchData(data).success);
  }

  /**
   * Check if batch exists by name
   */
  hasBatch(key: string): boolean {
    this.logger.debug(`[ZUSTAND BATCH STATE] Checking if batch exists: ${key}`);
    return this.state.has(this.namespace, key);
  }

  /**
   * Delete a batch by key
   */
  deleteBatch(key: string): void {
    this.logger.debug(`[ZUSTAND BATCH STATE] Deleting batch: ${key}`);
    this.state.delete(this.namespace, key);
  }
}

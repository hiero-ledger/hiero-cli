import type { Logger, StateService } from '@/core';

import { ValidationError } from '@/core/errors';

import { SWAP_NAMESPACE } from './constants';
import { safeParseSwapData, type SwapData } from './schema';

export class ZustandSwapStateHelper {
  private state: StateService;
  private logger: Logger;
  private namespace: string;

  constructor(state: StateService, logger: Logger) {
    this.state = state;
    this.logger = logger;
    this.namespace = SWAP_NAMESPACE;
  }

  saveSwap(key: string, swapData: SwapData): void {
    this.logger.debug(`[ZUSTAND SWAP STATE] Saving swap: ${key}`);

    const validation = safeParseSwapData(swapData);
    if (!validation.success) {
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new ValidationError(`Invalid swap data: ${errors}`);
    }

    this.state.set(this.namespace, key, swapData);
    this.logger.debug(`[ZUSTAND SWAP STATE] Swap saved: ${key}`);
  }

  getSwap(key: string): SwapData | null {
    this.logger.debug(`[ZUSTAND SWAP STATE] Loading swap: ${key}`);
    const data = this.state.get<SwapData>(this.namespace, key);

    if (data) {
      const validation = safeParseSwapData(data);
      if (!validation.success) {
        this.logger.warn(
          `[ZUSTAND SWAP STATE] Invalid data for swap: ${key}. Errors: ${validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        );
        return null;
      }
    }

    return data || null;
  }

  listSwaps(): SwapData[] {
    this.logger.debug(`[ZUSTAND SWAP STATE] Listing all swaps`);
    const allData = this.state.list<SwapData>(this.namespace);
    return allData.filter((data) => safeParseSwapData(data).success);
  }

  hasSwap(key: string): boolean {
    this.logger.debug(`[ZUSTAND SWAP STATE] Checking if swap exists: ${key}`);
    return this.state.has(this.namespace, key);
  }

  deleteSwap(key: string): void {
    this.logger.debug(`[ZUSTAND SWAP STATE] Deleting swap: ${key}`);
    this.state.delete(this.namespace, key);
  }
}

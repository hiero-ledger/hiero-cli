/**
 * Zustand-based state for scheduled transactions (plugin-local persistence)
 */
import type { Logger, StateService } from '@/core';

import { ValidationError } from '@/core/errors';

import { SCHEDULE_NAMESPACE } from './schema';
import {
  safeParseScheduledTransactionData,
  type ScheduledTransactionData,
} from './schema';

export class ZustandScheduleStateHelper {
  private state: StateService;
  private logger: Logger;
  private namespace: string;

  constructor(state: StateService, logger: Logger) {
    this.state = state;
    this.logger = logger;
    this.namespace = SCHEDULE_NAMESPACE;
  }

  saveScheduled(key: string, data: ScheduledTransactionData): void {
    this.logger.debug(`[ZUSTAND SCHEDULE STATE] Saving schedule entry: ${key}`);

    const validation = safeParseScheduledTransactionData(data);
    if (!validation.success) {
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new ValidationError(`Invalid schedule data: ${errors}`);
    }

    this.state.set(this.namespace, key, data);
    this.logger.debug(`[ZUSTAND SCHEDULE STATE] Schedule entry saved: ${key}`);
  }

  getScheduled(key: string): ScheduledTransactionData | null {
    this.logger.debug(
      `[ZUSTAND SCHEDULE STATE] Loading schedule entry: ${key}`,
    );
    const data = this.state.get<ScheduledTransactionData>(this.namespace, key);

    if (data) {
      const validation = safeParseScheduledTransactionData(data);
      if (!validation.success) {
        this.logger.warn(
          `[ZUSTAND SCHEDULE STATE] Invalid data for key: ${key}`,
        );
        return null;
      }
    }

    return data || null;
  }

  listScheduled(): ScheduledTransactionData[] {
    this.logger.debug(`[ZUSTAND SCHEDULE STATE] Listing schedule entries`);
    const allData = this.state.list<ScheduledTransactionData>(this.namespace);
    return allData.filter(
      (data) => safeParseScheduledTransactionData(data).success,
    );
  }

  hasScheduled(key: string): boolean {
    return this.state.has(this.namespace, key);
  }

  deleteScheduled(key: string): void {
    this.logger.debug(
      `[ZUSTAND SCHEDULE STATE] Deleting schedule entry: ${key}`,
    );
    this.state.delete(this.namespace, key);
  }
}

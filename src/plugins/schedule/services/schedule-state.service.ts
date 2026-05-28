import type { Logger, StateService } from '@/core';
import type { ScheduledTransactionData } from '@/core/schemas/common-schemas';
import type { ScheduleStateService } from '@/plugins/schedule/services/schedule-state.service.interface';

import { ValidationError } from '@/core/errors';
import {
  safeParseScheduledTransactionData,
  SCHEDULE_NAMESPACE,
} from '@/plugins/schedule/schema';

export class ScheduleStateServiceImpl implements ScheduleStateService {
  private readonly namespace = SCHEDULE_NAMESPACE;

  constructor(
    private readonly state: StateService,
    private readonly logger: Logger,
  ) {}

  saveScheduled(key: string, data: ScheduledTransactionData): void {
    this.logger.debug(`[SCHEDULE STATE] Saving schedule entry: ${key}`);

    const validation = safeParseScheduledTransactionData(data);
    if (!validation.success) {
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new ValidationError(`Invalid schedule data: ${errors}`);
    }

    this.state.set(this.namespace, key, data);
    this.logger.debug(`[SCHEDULE STATE] Schedule entry saved: ${key}`);
  }

  getScheduled(key: string): ScheduledTransactionData | null {
    this.logger.debug(`[SCHEDULE STATE] Loading schedule entry: ${key}`);
    const data = this.state.get<ScheduledTransactionData>(this.namespace, key);

    if (!data) {
      return null;
    }

    const validation = safeParseScheduledTransactionData(data);
    if (!validation.success) {
      this.logger.warn(`[SCHEDULE STATE] Invalid data for key: ${key}`);
      return null;
    }

    return data;
  }

  listScheduled(): ScheduledTransactionData[] {
    this.logger.debug('[SCHEDULE STATE] Listing schedule entries');
    const allData = this.state.list<ScheduledTransactionData>(this.namespace);
    return allData.filter(
      (data) => safeParseScheduledTransactionData(data).success,
    );
  }

  hasScheduled(key: string): boolean {
    return this.state.has(this.namespace, key);
  }

  deleteScheduled(key: string): void {
    this.logger.debug(`[SCHEDULE STATE] Deleting schedule entry: ${key}`);
    this.state.delete(this.namespace, key);
  }
}

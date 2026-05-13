import type { HederaMirrornodeService, Logger, StateService } from '@/core';
import type {
  ResolvedSchedule,
  ScheduleHelperResolveParams,
} from '@/plugins/schedule/shared/types';

import { EntityReferenceType } from '@/core';
import { NotFoundError, ValidationError } from '@/core/errors';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandScheduleStateHelper } from '@/plugins/schedule/zustand-state-helper';

export interface ResolveScheduleIdArgs {
  name?: string;
  scheduleId?: string;
}

export class ScheduleHelper {
  constructor(
    private readonly state: StateService,
    private readonly mirror: HederaMirrornodeService,
    private readonly logger: Logger,
  ) {}

  async resolveScheduleIdByEntityReference(
    params: ScheduleHelperResolveParams,
  ): Promise<ResolvedSchedule> {
    if (params.type === EntityReferenceType.EVM_ADDRESS) {
      throw new ValidationError(
        `Wrong reference submitted for schedule resolving ${params.type}`,
      );
    } else if (params.type === EntityReferenceType.ALIAS) {
      const scheduleState = new ZustandScheduleStateHelper(
        this.state,
        this.logger,
      );
      const key = composeKey(params.network, params.scheduleReference);
      const entry = scheduleState.getScheduled(key);
      if (!entry) {
        throw new NotFoundError(
          `No saved schedule found for name: ${params.scheduleReference}`,
        );
      }
      return {
        name: entry.name,
        scheduleId: entry.scheduledId,
        scheduled: entry.scheduled,
        executed: entry.executed,
        adminKeyRefIds: entry.adminKeyRefIds,
      };
    } else {
      const response = await this.mirror.getScheduled(params.scheduleReference);
      return {
        scheduleId: response.schedule_id,
        scheduled: true,
        executed: !!response.executed_timestamp,
      };
    }
  }
}

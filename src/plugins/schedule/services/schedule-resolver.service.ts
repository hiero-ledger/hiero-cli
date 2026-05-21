import type { HederaMirrornodeService } from '@/core';
import type { ScheduleResolverService } from '@/plugins/schedule/services/schedule-resolver.service.interface';
import type { ScheduleStateService } from '@/plugins/schedule/services/schedule-state.service.interface';
import type {
  ResolvedSchedule,
  ScheduleResolveParams,
} from '@/plugins/schedule/shared/types';

import { EntityReferenceType } from '@/core';
import { NotFoundError, ValidationError } from '@/core/errors';
import { composeKey } from '@/core/utils/key-composer';

export class ScheduleResolverServiceImpl implements ScheduleResolverService {
  constructor(
    private readonly scheduleState: ScheduleStateService,
    private readonly mirror: HederaMirrornodeService,
  ) {}

  async resolveScheduleIdByEntityReference(
    params: ScheduleResolveParams,
  ): Promise<ResolvedSchedule> {
    if (params.type === EntityReferenceType.EVM_ADDRESS) {
      throw new ValidationError(
        `Wrong reference submitted for schedule resolving ${params.type}`,
      );
    }

    if (params.type === EntityReferenceType.ALIAS) {
      return this.resolveLocalSchedule(params);
    }

    const response = await this.mirror.getScheduled(params.scheduleReference);
    return {
      scheduleId: response.schedule_id,
      scheduled: true,
      executed: Boolean(response.executed_timestamp),
    };
  }

  private resolveLocalSchedule(
    params: ScheduleResolveParams,
  ): ResolvedSchedule {
    const key = composeKey(params.network, params.scheduleReference);
    const entry = this.scheduleState.getScheduled(key);

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
  }
}

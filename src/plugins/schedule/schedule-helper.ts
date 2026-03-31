import type { HederaMirrornodeService, Logger, StateService } from '@/core';
import type { SupportedNetwork } from '@/core/types/shared.types';
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
  /**
   * Resolves a schedule id from CLI args: explicit id or a saved name that already has an on-chain id.
   */
  resolveScheduleIdFromArgs(
    network: SupportedNetwork,
    args: ResolveScheduleIdArgs,
  ): string {
    if (args.scheduleId && args.name) {
      throw new ValidationError('Provide only one of: name, schedule-id');
    }
    if (!args.scheduleId && !args.name) {
      throw new ValidationError('Provide one of: name, schedule-id');
    }

    if (args.scheduleId) {
      return args.scheduleId;
    }

    const scheduleState = new ZustandScheduleStateHelper(
      this.state,
      this.logger,
    );
    const key = composeKey(network, args.name!);
    const entry = scheduleState.getScheduled(key);
    if (!entry) {
      throw new NotFoundError(`No saved schedule found for name: ${args.name}`);
    }
    if (!entry.scheduledId) {
      throw new ValidationError(
        `Schedule "${args.name}" has no schedule id yet. Submit a transaction with --scheduled ${args.name} first.`,
      );
    }
    return entry.scheduledId;
  }
}

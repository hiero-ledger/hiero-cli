import type {
  ResolvedSchedule,
  ScheduleResolveParams,
} from '@/plugins/schedule/shared/types';

export interface ScheduleResolverService {
  resolveScheduleIdByEntityReference(
    params: ScheduleResolveParams,
  ): Promise<ResolvedSchedule>;
}

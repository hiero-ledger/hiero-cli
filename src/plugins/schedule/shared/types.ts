import type { EntityReferenceType, SupportedNetwork } from '@/core';

export interface ResolvedSchedule {
  name?: string;
  scheduleId?: string;
  scheduled: boolean;
  executed: boolean;
  adminKeyRefIds?: string[];
}

export interface ScheduleHelperResolveParams {
  scheduleReference: string;
  type: EntityReferenceType;
  network: SupportedNetwork;
}

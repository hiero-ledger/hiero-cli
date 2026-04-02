import type {
  EntityReferenceType,
  KeyAlgorithm,
  SupportedNetwork,
} from '@/core';

export interface ResolvedSchedule {
  name?: string;
  scheduleId?: string;
  scheduled: boolean;
  executed: boolean;
  adminPublicKey?: string;
  adminKeyType?: KeyAlgorithm;
  adminKeyRefId?: string;
}

export interface ScheduleHelperResolveParams {
  scheduleReference: string;
  type: EntityReferenceType;
  network: SupportedNetwork;
}

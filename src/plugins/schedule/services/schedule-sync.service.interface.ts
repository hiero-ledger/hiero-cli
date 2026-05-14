import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { ScheduledTransactionData } from '@/plugins/schedule/schema';

export interface ScheduleSyncService {
  markExecutionStatusFromMirror(
    scheduleId: string,
    scheduleName: string | undefined,
    network: SupportedNetwork,
  ): Promise<ScheduledTransactionData | undefined>;
  upsertNamedScheduleFromMirror(
    scheduleName: string,
    scheduleId: string,
    network: SupportedNetwork,
    keyManager: KeyManager,
  ): Promise<ScheduledTransactionData>;
}

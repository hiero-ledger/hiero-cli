import type { ScheduleSignTransaction } from '@hashgraph/sdk';
import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
} from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { ScheduledTransactionData } from '@/plugins/schedule/schema';

export interface ScheduleSignNormalisedParams extends BaseNormalizedParams {
  scheduleName?: string;
  scheduleId: string;
  scheduled: boolean;
  executed: boolean;
  network: SupportedNetwork;
  keyManager: KeyManager;
}

export interface ScheduleSignBuildTransactionResult extends BaseBuildTransactionResult {
  transaction: ScheduleSignTransaction;
}

export interface ScheduleSignSignTransactionResult extends BaseSignTransactionResult {}

export interface ScheduleSignExecuteTransactionResult {
  scheduledData?: ScheduledTransactionData;
  transactionId: string;
  success: boolean;
  status?: string;
}

import type { ScheduleDeleteTransaction } from '@hiero-ledger/sdk';
import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
} from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';

export interface ScheduleDeleteNormalisedParams extends BaseNormalizedParams {
  scheduleName?: string;
  scheduleId: string;
  scheduled: boolean;
  executed: boolean;
  network: SupportedNetwork;
  keyManager: KeyManager;
}

export interface ScheduleDeleteBuildTransactionResult extends BaseBuildTransactionResult {
  transaction: ScheduleDeleteTransaction;
}

export interface ScheduleDeleteSignTransactionResult extends BaseSignTransactionResult {}

export interface ScheduleDeleteExecuteTransactionResult {
  transactionId: string;
  success: boolean;
  status?: string;
}

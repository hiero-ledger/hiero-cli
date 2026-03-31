import type {
  ScheduleCreateTransaction,
  ScheduleDeleteTransaction,
  ScheduleSignTransaction,
} from '@hashgraph/sdk';
import type {
  ScheduleCreateParams,
  ScheduleDeleteTransactionParams,
  ScheduleSignTransactionParams,
} from '@/core/services/schedule-transaction/types';

export interface ScheduleTransactionService {
  buildScheduleCreateTransaction(
    params: ScheduleCreateParams,
  ): ScheduleCreateTransaction;

  buildScheduleSignTransaction(
    params: ScheduleSignTransactionParams,
  ): ScheduleSignTransaction;

  buildScheduleDeleteTransaction(
    params: ScheduleDeleteTransactionParams,
  ): ScheduleDeleteTransaction;
}

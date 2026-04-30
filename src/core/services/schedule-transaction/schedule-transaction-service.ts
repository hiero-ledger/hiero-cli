import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { ScheduleTransactionService } from '@/core/services/schedule-transaction/schedule-transaction-service.interface';
import type {
  ScheduleCreateParams,
  ScheduleDeleteTransactionParams,
  ScheduleSignTransactionParams,
} from '@/core/services/schedule-transaction/types';

import {
  AccountId,
  PublicKey,
  ScheduleCreateTransaction,
  ScheduleDeleteTransaction,
  ScheduleSignTransaction,
  Timestamp,
} from '@hiero-ledger/sdk';

export class ScheduleTransactionServiceImpl implements ScheduleTransactionService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  buildScheduleCreateTransaction(
    params: ScheduleCreateParams,
  ): ScheduleCreateTransaction {
    this.logger.debug('[SCHEDULE TX] Create ScheduleCreateTransaction');

    let tx = new ScheduleCreateTransaction()
      .setScheduledTransaction(params.innerTransaction)
      .setWaitForExpiry(params.waitForExpiry);

    if (params.payerAccountId) {
      tx = tx.setPayerAccountId(AccountId.fromString(params.payerAccountId));
    }

    if (params.adminKey) {
      tx = tx.setAdminKey(PublicKey.fromString(params.adminKey));
    }

    if (params.scheduleMemo) {
      tx = tx.setScheduleMemo(params.scheduleMemo);
    }

    if (params.expirationTime) {
      tx = tx.setExpirationTime(Timestamp.fromDate(params.expirationTime));
    }

    return tx;
  }

  buildScheduleSignTransaction(
    params: ScheduleSignTransactionParams,
  ): ScheduleSignTransaction {
    this.logger.debug('[SCHEDULE TX] Building ScheduleSignTransaction');
    return new ScheduleSignTransaction().setScheduleId(params.scheduleId);
  }

  buildScheduleDeleteTransaction(
    params: ScheduleDeleteTransactionParams,
  ): ScheduleDeleteTransaction {
    this.logger.debug('[SCHEDULE TX] Building ScheduleDeleteTransaction');
    return new ScheduleDeleteTransaction().setScheduleId(params.scheduleId);
  }
}

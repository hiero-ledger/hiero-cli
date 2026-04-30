import type { Transaction } from '@hiero-ledger/sdk';

export interface ScheduleCreateParams {
  innerTransaction: Transaction;
  payerAccountId?: string;
  adminKey?: string;
  scheduleMemo?: string;
  expirationTime?: Date;
  waitForExpiry: boolean;
}

export interface ScheduleSignTransactionParams {
  scheduleId: string;
}

export interface ScheduleDeleteTransactionParams {
  scheduleId: string;
}

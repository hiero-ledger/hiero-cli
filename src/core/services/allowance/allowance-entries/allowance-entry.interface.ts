import type { AccountAllowanceApproveTransaction } from '@hiero-ledger/sdk';

export interface AllowanceEntry {
  apply(tx: AccountAllowanceApproveTransaction): void;
}

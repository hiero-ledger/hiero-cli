import type { AccountAllowanceApproveTransaction } from '@hashgraph/sdk';

export interface AllowanceEntry {
  apply(tx: AccountAllowanceApproveTransaction): void;
}

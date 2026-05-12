import type { AccountAllowanceApproveTransaction } from '@hiero-ledger/sdk';
import type { AllowanceEntry } from './allowance-entry.interface';

import { AccountId, Hbar, HbarUnit } from '@hiero-ledger/sdk';

export class HbarAllowanceEntry implements AllowanceEntry {
  constructor(
    public readonly ownerAccountId: string,
    public readonly spenderAccountId: string,
    public readonly amountTinybar: bigint,
  ) {}

  apply(tx: AccountAllowanceApproveTransaction): void {
    tx.approveHbarAllowance(
      AccountId.fromString(this.ownerAccountId),
      AccountId.fromString(this.spenderAccountId),
      new Hbar(this.amountTinybar.toString(), HbarUnit.Tinybar),
    );
  }
}

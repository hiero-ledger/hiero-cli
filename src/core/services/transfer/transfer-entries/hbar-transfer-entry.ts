import type { TransferTransaction } from '@hiero-ledger/sdk';
import type { TransferEntry } from './transfer-entry.interface';

import { AccountId, Hbar, HbarUnit } from '@hiero-ledger/sdk';

export class HbarTransferEntry implements TransferEntry {
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly amountTinybar: bigint,
  ) {}

  apply(tx: TransferTransaction): void {
    tx.addHbarTransfer(
      AccountId.fromString(this.from),
      new Hbar((-this.amountTinybar).toString(), HbarUnit.Tinybar),
    );
    tx.addHbarTransfer(
      AccountId.fromString(this.to),
      new Hbar(this.amountTinybar.toString(), HbarUnit.Tinybar),
    );
  }
}

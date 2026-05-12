import type { TransferTransaction } from '@hiero-ledger/sdk';
import type { TransferEntry } from './transfer-entry.interface';

import { AccountId, Long, TokenId } from '@hiero-ledger/sdk';

export class FtTransferEntry implements TransferEntry {
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly tokenId: string,
    public readonly amount: bigint,
  ) {}

  apply(tx: TransferTransaction): void {
    tx.addTokenTransfer(
      TokenId.fromString(this.tokenId),
      AccountId.fromString(this.from),
      Long.fromString(this.amount.toString()).negate(),
    );
    tx.addTokenTransfer(
      TokenId.fromString(this.tokenId),
      AccountId.fromString(this.to),
      Long.fromString(this.amount.toString()),
    );
  }
}

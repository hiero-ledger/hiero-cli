import type { TransferTransaction } from '@hiero-ledger/sdk';
import type { TransferEntry } from './transfer-entry.interface';

import { AccountId, Long, NftId, TokenId } from '@hiero-ledger/sdk';

export class NftTransferEntry implements TransferEntry {
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly tokenId: string,
    public readonly serialNumber: number,
  ) {}

  apply(tx: TransferTransaction): void {
    tx.addNftTransfer(
      new NftId(
        TokenId.fromString(this.tokenId),
        Long.fromNumber(this.serialNumber),
      ),
      AccountId.fromString(this.from),
      AccountId.fromString(this.to),
    );
  }
}

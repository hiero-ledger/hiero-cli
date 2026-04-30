import type { TransferEntry } from './transfer-entries/transfer-entry.interface';
import type { TransferService } from './transfer-service.interface';

import { TransferTransaction } from '@hashgraph/sdk';

export class TransferServiceImpl implements TransferService {
  buildTransferTransaction(
    entries: TransferEntry[],
    memo?: string,
  ): TransferTransaction {
    if (entries.length === 0) {
      throw new Error('buildTransferTransaction requires at least one entry');
    }
    const tx = new TransferTransaction();
    for (const entry of entries) {
      entry.apply(tx);
    }
    if (memo) {
      tx.setTransactionMemo(memo);
    }
    return tx;
  }
}

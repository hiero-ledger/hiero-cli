import type { TransferEntry } from './transfer-entries/transfer-entry.interface';
import type { TransferService } from './transfer-service.interface';

import { TransferTransaction } from '@hiero-ledger/sdk';

import { ValidationError } from '@/core/errors';
import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';

export class TransferServiceImpl implements TransferService {
  buildTransferTransaction(
    entries: TransferEntry[],
    memo?: string,
  ): TransferTransaction {
    if (entries.length === 0) {
      throw new ValidationError(
        'buildTransferTransaction requires at least one entry',
      );
    }
    if (entries.length > HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION) {
      throw new ValidationError(
        `buildTransferTransaction supports at most ${HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION} entries per transaction`,
      );
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

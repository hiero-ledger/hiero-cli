import type { TransferEntry } from './transfer-entries/transfer-entry.interface';
import type { TransferService } from './transfer-service.interface';

import { TransferTransaction } from '@hiero-ledger/sdk';

import { TransactionValidationError } from '@/core/errors';
import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';

export class TransferServiceImpl implements TransferService {
  buildTransferTransaction(
    entries: TransferEntry[],
    memo?: string,
  ): TransferTransaction {
    if (entries.length === 0) {
      throw new TransactionValidationError(
        'TransferTransaction requires at least one transfer entry',
      );
    }
    if (entries.length > HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION) {
      throw new TransactionValidationError(
        `TransferTransaction supports at most ${HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION} entries per transaction`,
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

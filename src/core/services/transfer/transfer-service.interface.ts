import type { TransferTransaction } from '@hiero-ledger/sdk';
import type { TransferEntry } from './transfer-entries/transfer-entry.interface';

export interface TransferService {
  buildTransferTransaction(
    entries: TransferEntry[],
    memo?: string,
  ): TransferTransaction;
}

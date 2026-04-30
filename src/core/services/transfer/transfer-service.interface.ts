import type { TransferTransaction } from '@hashgraph/sdk';
import type { TransferEntry } from './transfer-entries/transfer-entry.interface';

export interface TransferService {
  buildTransferTransaction(
    entries: TransferEntry[],
    memo?: string,
  ): TransferTransaction;
}

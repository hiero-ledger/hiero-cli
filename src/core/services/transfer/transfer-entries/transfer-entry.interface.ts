import type { TransferTransaction } from '@hiero-ledger/sdk';

export interface TransferEntry {
  apply(tx: TransferTransaction): void;
}

import type { TransferTransaction } from '@hashgraph/sdk';

export interface TransferEntry {
  apply(tx: TransferTransaction): void;
}

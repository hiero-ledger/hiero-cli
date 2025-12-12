/**
 * HBAR Service Interface
 * Encapsulates HBAR-related operations
 */
import type { TransferTransaction } from '@hashgraph/sdk';

export interface HbarService {
  transferTinybar(
    params: TransferTinybarParams,
  ): Promise<TransferTinybarResult>;
}

export interface TransferTinybarParams {
  amount: bigint;
  from: string;
  to: string;
  memo?: string;
}

export interface TransferTinybarResult {
  transaction: TransferTransaction;
}

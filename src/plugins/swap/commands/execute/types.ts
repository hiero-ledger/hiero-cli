import type { Transaction } from '@hashgraph/sdk';
import type { TransactionResult } from '@/core';
import type { SwapData } from '@/plugins/swap/schema';

export interface SwapExecuteNormalizedParams {
  swapId: string;
  swapName: string;
  swapData: SwapData;
  network: string;
  keyRefIds: string[];
}

export interface SwapExecuteBuildResult {
  transaction: Transaction;
}

export interface SwapExecuteSignResult {
  signedTransaction: Transaction;
}

export interface SwapExecuteTransactionResult {
  transactionResult: TransactionResult;
  updatedSwapData: SwapData;
}

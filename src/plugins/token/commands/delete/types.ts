import type { Transaction } from '@hashgraph/sdk';
import type { SupportedNetwork, TransactionResult } from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';

export interface TokenDeleteNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  tokenName: string;
  adminKeyResolved: ResolvedPublicKey;
}

export interface TokenDeleteBuildTransactionResult {
  transaction: Transaction;
}

export interface TokenDeleteSignTransactionResult {
  signedTransaction: Transaction;
}

export interface TokenDeleteExecuteTransactionResult {
  transactionResult: TransactionResult;
}

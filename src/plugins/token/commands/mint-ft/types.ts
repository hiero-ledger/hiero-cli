import type { Transaction } from '@hashgraph/sdk';
import type { SupportedNetwork, TransactionResult } from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';

export interface MintFtNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  rawAmount: bigint;
  supplyKeyResolved: ResolvedPublicKey;
}

export interface MintFtBuildTransactionResult {
  transaction: Transaction;
}

export interface MintFtSignTransactionResult {
  transaction: Transaction;
}

export interface MintFtExecuteTransactionResult {
  transactionResult: TransactionResult;
}

import type { Transaction } from '@hashgraph/sdk';
import type { SupportedNetwork, TransactionResult } from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';

export interface MintNftNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  metadataBytes: Uint8Array;
  supplyKeyResolved: ResolvedPublicKey;
}

export interface MintNftBuildTransactionResult {
  transaction: Transaction;
}

export interface MintNftSignTransactionResult {
  transaction: Transaction;
}

export interface MintNftExecuteTransactionResult {
  transactionResult: TransactionResult;
}

import type { Transaction } from '@hashgraph/sdk';
import type { SupportedNetwork, TransactionResult } from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';

export interface TokenMintNftNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  metadataBytes: Uint8Array;
  supplyKeyResolved: ResolvedPublicKey;
}

export interface TokenMintNftBuildTransactionResult {
  transaction: Transaction;
}

export interface TokenMintNftSignTransactionResult {
  signedTransaction: Transaction;
}

export interface TokenMintNftExecuteTransactionResult {
  transactionResult: TransactionResult;
}

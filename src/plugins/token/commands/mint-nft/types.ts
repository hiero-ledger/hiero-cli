import type { Transaction } from '@hashgraph/sdk';
import type {
  BatchifyBuildTransactionResult,
  BatchifyNormalizedParams,
  BatchifySignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';

export interface TokenMintNftNormalizedParams extends BatchifyNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  metadataBytes: Uint8Array;
  supplyKeyResolved: ResolvedPublicKey;
}

export interface TokenMintNftBuildTransactionResult extends BatchifyBuildTransactionResult {
  transaction: Transaction;
}

export interface TokenMintNftSignTransactionResult extends BatchifySignTransactionResult {
  signedTransaction: Transaction;
}

export interface TokenMintNftExecuteTransactionResult {
  transactionResult: TransactionResult;
}

import type { Transaction } from '@hashgraph/sdk';
import type {
  BatchifyBuildTransactionResult,
  BatchifyNormalizedParams,
  BatchifySignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';

export interface MintFtNormalizedParams extends BatchifyNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  rawAmount: bigint;
  supplyKeyResolved: ResolvedPublicKey;
}

export interface MintFtBuildTransactionResult extends BatchifyBuildTransactionResult {
  transaction: Transaction;
}

export interface MintFtSignTransactionResult extends BatchifySignTransactionResult {
  signedTransaction: Transaction;
}

export interface MintFtExecuteTransactionResult {
  transactionResult: TransactionResult;
}

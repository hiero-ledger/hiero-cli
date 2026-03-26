import type { Transaction } from '@hashgraph/sdk';
import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';

export interface MintFtNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  rawAmount: bigint;
  supplyKeyResolved: ResolvedPublicKey;
}

export interface MintFtBuildTransactionResult extends BaseBuildTransactionResult {
  transaction: Transaction;
}

export interface MintFtSignTransactionResult extends BaseSignTransactionResult {
  signedTransaction: Transaction;
}

export interface MintFtExecuteTransactionResult {
  transactionResult: TransactionResult;
}

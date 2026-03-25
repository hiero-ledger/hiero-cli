import type { Transaction, TransferTransaction } from '@hashgraph/sdk';
import type {
  BatchifyBuildTransactionResult,
  BatchifyNormalizedParams,
  BatchifySignTransactionResult,
} from '@/core';
import type { ResolvedAccountCredential } from '@/core/services/key-resolver/types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@/core/types/shared.types';

export interface TransferNormalisedParams extends BatchifyNormalizedParams {
  amount: bigint;
  memo: string | undefined;
  keyManager: KeyManager;
  fromAccount: ResolvedAccountCredential;
  destination: string;
  currentNetwork: SupportedNetwork;
}

export interface TransferBuildTransactionResult extends BatchifyBuildTransactionResult {
  transaction: TransferTransaction;
}

export interface TransferSignTransactionResult extends BatchifySignTransactionResult {
  signedTransaction: Transaction;
}

export type TransferExecuteTransactionResult = TransactionResult;

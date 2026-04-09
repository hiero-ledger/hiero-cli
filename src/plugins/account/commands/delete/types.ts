import type {
  AccountDeleteTransaction,
  Transaction as HederaTransaction,
} from '@hashgraph/sdk';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@/core/types/shared.types';

export interface AccountDeleteContext {
  accountId: string;
  keyRefId: string;
  name?: string;
}

export interface AccountDeleteLocalStateInput {
  accountId: string;
}

export interface AccountDeleteKmsCleanupInput {
  keyRefId: string;
}

export interface DeleteNormalisedParams {
  network: SupportedNetwork;
  stateKey: string;
  accountToDelete: AccountDeleteContext;
  transferAccountId: string;
  accountRef: string;
}

export interface DeleteBuildTransactionResult {
  transaction: AccountDeleteTransaction;
}

export interface DeleteSignTransactionResult {
  signedTransaction: HederaTransaction;
}

export type DeleteExecuteTransactionResult = TransactionResult;

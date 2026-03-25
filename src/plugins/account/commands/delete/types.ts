import type {
  AccountDeleteTransaction,
  Transaction as HederaTransaction,
} from '@hashgraph/sdk';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@/core/types/shared.types';
import type { AccountData } from '@/plugins/account/schema';

export interface DeleteNormalisedParams {
  network: SupportedNetwork;
  stateKey: string;
  accountToDelete: AccountData;
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

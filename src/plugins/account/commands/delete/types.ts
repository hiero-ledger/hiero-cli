import type {
  AccountDeleteTransaction,
  Transaction as HederaTransaction,
} from '@hiero-ledger/sdk';
import type { BaseExecuteTransactionResult } from '@/core';
import type { SupportedNetwork } from '@/core/types/shared.types';

export interface AccountDeleteContext {
  accountId: string;
  keyRefId: string;
  name?: string;
}

export type {
  AccountDeleteKmsCleanupInput,
  AccountDeleteLocalStateInput,
} from '@/plugins/account/services/account-cleanup.service.interface';

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

export interface DeleteExecuteTransactionResult extends BaseExecuteTransactionResult {}

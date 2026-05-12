import type { Transaction } from '@hiero-ledger/sdk';
import type {
  BaseExecuteTransactionResult,
  BaseNormalizedParams,
  SupportedNetwork,
} from '@/core';
import type { ResolvedAccountCredential } from '@/core/services/key-resolver/types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';

export interface AssociateNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  account: ResolvedAccountCredential;
  keyManager: KeyManager;
}

export interface AssociateBuildTransactionResult {
  transaction: Transaction;
}

export interface AssociateSignTransactionResult {
  signedTransaction: Transaction;
}

export interface AssociateExecuteTransactionResult extends BaseExecuteTransactionResult {}

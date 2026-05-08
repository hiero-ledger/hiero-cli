import type { Transaction } from '@hiero-ledger/sdk';
import type {
  BaseExecuteTransactionResult,
  BaseNormalizedParams,
  SupportedNetwork,
} from '@/core';
import type { ResolvedAccountCredential } from '@/core/services/key-resolver/types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';

export interface DissociateNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  account: ResolvedAccountCredential;
  keyManager: KeyManager;
}

export interface DissociateBuildTransactionResult {
  transaction: Transaction;
}

export interface DissociateSignTransactionResult {
  signedTransaction: Transaction;
}

export interface DissociateExecuteTransactionResult extends BaseExecuteTransactionResult {}

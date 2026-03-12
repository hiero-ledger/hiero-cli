import type { Transaction } from '@hashgraph/sdk';
import type { SupportedNetwork, TransactionResult } from '@/core';
import type { ResolvedAccountCredential } from '@/core/services/key-resolver/types';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';

export interface AssociateNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  account: ResolvedAccountCredential;
  keyManager: KeyManagerName;
  alreadyAssociated: boolean;
}

export interface AssociateBuildTransactionResult {
  transaction?: Transaction;
}

export interface AssociateSignTransactionResult {
  transaction?: Transaction;
}

export interface AssociateExecuteTransactionResult {
  transactionResult?: TransactionResult;
  alreadyAssociated: boolean;
}

import type { Transaction } from '@hashgraph/sdk';
import type { TransactionResult } from '@/core';
import type {
  ResolvedAccountCredential,
  ResolvedPublicKey,
} from '@/core/services/key-resolver/types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { FungibleTokenFileDefinition } from '@/plugins/token/schema';

export interface CreateFtFromFileNormalizedParams {
  filename: string;
  keyManager: KeyManager;
  tokenDefinition: FungibleTokenFileDefinition;
  network: SupportedNetwork;
  treasury: ResolvedAccountCredential;
  adminKey: ResolvedPublicKey;
  supplyKey?: ResolvedPublicKey;
  wipeKey?: ResolvedPublicKey;
  kycKey?: ResolvedPublicKey;
  freezeKey?: ResolvedPublicKey;
  pauseKey?: ResolvedPublicKey;
  feeScheduleKey?: ResolvedPublicKey;
}

export interface CreateFtFromFileBuildTransactionResult {
  transaction: Transaction;
}

export interface CreateFtFromFileSignTransactionResult {
  transaction: Transaction;
}

export interface CreateFtFromFileExecuteTransactionResult {
  transactionResult: TransactionResult;
}

export interface CreateFtFromFileAssociationOutput {
  accountId: string;
  name: string;
  success: boolean;
  transactionId: string;
}

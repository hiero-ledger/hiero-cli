import type { Transaction } from '@hashgraph/sdk';
import type { TransactionResult } from '@/core';
import type {
  ResolvedAccountCredential,
  ResolvedPublicKey,
} from '@/core/services/key-resolver/types';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { NonFungibleTokenFileDefinition } from '@/plugins/token/schema';

export interface CreateNftFromFileNormalizedParams {
  filename: string;
  keyManager: KeyManagerName;
  tokenDefinition: NonFungibleTokenFileDefinition;
  network: SupportedNetwork;
  treasury: ResolvedAccountCredential;
  adminKey: ResolvedPublicKey;
  supplyKey: ResolvedPublicKey;
  wipeKey?: ResolvedPublicKey;
  kycKey?: ResolvedPublicKey;
  freezeKey?: ResolvedPublicKey;
  pauseKey?: ResolvedPublicKey;
  feeScheduleKey?: ResolvedPublicKey;
}

export interface CreateNftFromFileBuildTransactionResult {
  transaction: Transaction;
}

export interface CreateNftFromFileSignTransactionResult {
  transaction: Transaction;
}

export interface CreateNftFromFileExecuteTransactionResult {
  transactionResult: TransactionResult;
}

export interface CreateNftFromFileAssociationOutput {
  accountId: string;
  name: string;
  success: boolean;
  transactionId: string;
}

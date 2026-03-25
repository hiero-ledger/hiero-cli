import type { Transaction } from '@hashgraph/sdk';
import type {
  BatchifyBuildTransactionResult,
  BatchifyNormalizedParams,
  BatchifySignTransactionResult,
  TransactionResult,
} from '@/core';
import type {
  ResolvedAccountCredential,
  ResolvedPublicKey,
} from '@/core/services/key-resolver/types';
import type {
  Credential,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';
import type { SupplyType, SupportedNetwork } from '@/core/types/shared.types';

export interface TokenCreateNftFromFileNormalizedParams extends BatchifyNormalizedParams {
  filename: string;
  name: string;
  symbol: string;
  supplyType: SupplyType;
  maxSupply?: bigint;
  memo: string;
  associations: Credential[];
  keyManager: KeyManager;
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

export interface TokenCreateNftFromFileBuildTransactionResult extends BatchifyBuildTransactionResult {
  transaction: Transaction;
}

export interface TokenCreateNftFromFileSignTransactionResult extends BatchifySignTransactionResult {
  signedTransaction: Transaction;
}

export interface TokenCreateNftFromFileExecuteTransactionResult {
  transactionResult: TransactionResult;
}

export interface TokenCreateNftFromFileAssociationOutput {
  accountId: string;
  name: string;
  success: boolean;
  transactionId: string;
}

import type { Transaction } from '@hashgraph/sdk';
import type { TransactionResult } from '@/core';
import type {
  ResolvedAccountCredential,
  ResolvedPublicKey,
} from '@/core/services/key-resolver/types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { HederaTokenType } from '@/core/shared/constants';
import type { SupplyType, SupportedNetwork } from '@/core/types/shared.types';

export interface TokenCreateFtNormalizedParams {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: bigint;
  supplyType: SupplyType;
  alias?: string;
  memo?: string;
  tokenType: HederaTokenType;
  network: SupportedNetwork;
  keyManager: KeyManager;
  treasury: ResolvedAccountCredential;
  admin?: ResolvedPublicKey;
  supply?: ResolvedPublicKey;
  freeze?: ResolvedPublicKey;
  wipe?: ResolvedPublicKey;
  kyc?: ResolvedPublicKey;
  pause?: ResolvedPublicKey;
  feeSchedule?: ResolvedPublicKey;
  metadata?: ResolvedPublicKey;
  freezeDefault: boolean;
  finalMaxSupply?: bigint;
}

export interface TokenCreateFtBuildTransactionResult {
  transaction: Transaction;
}

export interface TokenCreateFtSignTransactionResult {
  signedTransaction: Transaction;
}

export interface TokenCreateFtExecuteTransactionResult {
  transactionResult: TransactionResult;
}

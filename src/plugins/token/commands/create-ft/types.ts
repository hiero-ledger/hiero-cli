import type { Transaction } from '@hashgraph/sdk';
import type { TransactionResult } from '@/core';
import type {
  ResolvedAccountCredential,
  ResolvedPublicKey,
} from '@/core/services/key-resolver/types';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { HederaTokenType } from '@/core/shared/constants';
import type { SupplyType, SupportedNetwork } from '@/core/types/shared.types';

export interface CreateFtNormalizedParams {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: bigint;
  supplyType: SupplyType;
  alias?: string;
  memo?: string;
  tokenType: HederaTokenType;
  network: SupportedNetwork;
  keyManager: KeyManagerName;
  treasury: ResolvedAccountCredential;
  admin: ResolvedAccountCredential;
  supply?: ResolvedPublicKey;
  finalMaxSupply?: bigint;
  adminKeyProvided: boolean;
}

export interface CreateFtBuildTransactionResult {
  transaction: Transaction;
}

export interface CreateFtSignTransactionResult {
  signedTransaction: Transaction;
}

export interface CreateFtExecuteTransactionResult {
  transactionResult: TransactionResult;
}

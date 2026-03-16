import type { Transaction } from '@hashgraph/sdk';
import type { TransactionResult } from '@/core';
import type { ResolvedAccountCredential } from '@/core/services/key-resolver/types';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { HederaTokenType } from '@/core/shared/constants';
import type { SupplyType, SupportedNetwork } from '@/core/types/shared.types';

export interface CreateNftNormalizedParams {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: bigint;
  tokenType: HederaTokenType;
  supplyType: SupplyType;
  alias?: string;
  memo?: string;
  network: SupportedNetwork;
  keyManager: KeyManagerName;
  treasury: ResolvedAccountCredential;
  admin: ResolvedAccountCredential;
  supply: ResolvedAccountCredential;
  finalMaxSupply?: bigint;
  adminKeyProvided: boolean;
}

export interface CreateNftBuildTransactionResult {
  transaction: Transaction;
}

export interface CreateNftSignTransactionResult {
  signedTransaction: Transaction;
}

export interface CreateNftExecuteTransactionResult {
  transactionResult: TransactionResult;
}

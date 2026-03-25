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
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { HederaTokenType } from '@/core/shared/constants';
import type { SupplyType, SupportedNetwork } from '@/core/types/shared.types';

export interface TokenCreateFtNormalizedParams extends BatchifyNormalizedParams {
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
  finalMaxSupply?: bigint;
}

export interface TokenCreateFtBuildTransactionResult extends BatchifyBuildTransactionResult {
  transaction: Transaction;
}

export interface TokenCreateFtSignTransactionResult extends BatchifySignTransactionResult {
  signedTransaction: Transaction;
}

export interface TokenCreateFtExecuteTransactionResult {
  transactionResult: TransactionResult;
}

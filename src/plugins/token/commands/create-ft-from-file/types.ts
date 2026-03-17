import type { Transaction } from '@hashgraph/sdk';
import type { HederaTokenType, SupplyType, TransactionResult } from '@/core';
import type {
  ResolvedAccountCredential,
  ResolvedPublicKey,
} from '@/core/services/key-resolver/types';
import type {
  Credential,
  KeyManagerName,
} from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TokenCustomFeeType } from '@/plugins/token/schema';

export interface TokenCreateFtFromFileNormalizedParams {
  filename: string;
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: bigint;
  maxSupply: bigint;
  supplyType: SupplyType;
  memo: string;
  tokenType: HederaTokenType;
  customFees: TokenCustomFeeType[];
  associations: Credential[];
  keyManager: KeyManagerName;
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

export interface TokenCreateFtFromFileBuildTransactionResult {
  transaction: Transaction;
}

export interface TokenCreateFtFromFileSignTransactionResult {
  signedTransaction: Transaction;
}

export interface TokenCreateFtFromFileExecuteTransactionResult {
  transactionResult: TransactionResult;
}

export interface TokenCreateFtFromFileAssociationOutput {
  accountId: string;
  name: string;
  success: boolean;
  transactionId: string;
}

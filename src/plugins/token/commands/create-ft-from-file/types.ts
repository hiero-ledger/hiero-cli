import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  HederaTokenType,
  SupplyType,
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
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TokenCustomFeeType } from '@/plugins/token/schema';

export interface TokenCreateFtFromFileNormalizedParams extends BaseNormalizedParams {
  filename: string;
  alias?: string;
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
  keyManager: KeyManager;
  network: SupportedNetwork;
  treasury: ResolvedAccountCredential;
  adminKeys: ResolvedPublicKey[];
  adminKeyThreshold: number;
  supplyKeys: ResolvedPublicKey[];
  supplyKeyThreshold: number;
  wipeKeys: ResolvedPublicKey[];
  wipeKeyThreshold: number;
  kycKeys: ResolvedPublicKey[];
  kycKeyThreshold: number;
  freezeKeys: ResolvedPublicKey[];
  freezeKeyThreshold: number;
  pauseKeys: ResolvedPublicKey[];
  pauseKeyThreshold: number;
  feeScheduleKeys: ResolvedPublicKey[];
  feeScheduleKeyThreshold: number;
  metadataKeys: ResolvedPublicKey[];
  metadataKeyThreshold: number;
  freezeDefault: boolean;
  autoRenewPeriodSeconds?: number;
  autoRenewAccountId?: string;
  expirationTime?: Date;
}

export interface TokenCreateFtFromFileBuildTransactionResult extends BaseBuildTransactionResult {}

export interface TokenCreateFtFromFileSignTransactionResult extends BaseSignTransactionResult {}

export interface TokenCreateFtFromFileExecuteTransactionResult {
  transactionResult: TransactionResult;
}

export interface TokenCreateFtFromFileAssociationOutput {
  accountId: string;
  name: string;
  success: boolean;
  transactionId: string;
}

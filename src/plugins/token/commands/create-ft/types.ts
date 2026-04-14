import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  TransactionResult,
} from '@/core';
import type {
  ResolvedAccountCredential,
  ResolvedPublicKey,
} from '@/core/services/key-resolver/types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { HederaTokenType } from '@/core/shared/constants';
import type { SupplyType, SupportedNetwork } from '@/core/types/shared.types';

export interface TokenCreateFtNormalizedParams extends BaseNormalizedParams {
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
  adminKeys: ResolvedPublicKey[];
  adminKeyThreshold: number;
  supplyKeys: ResolvedPublicKey[];
  supplyKeyThreshold: number;
  freezeKeys: ResolvedPublicKey[];
  freezeKeyThreshold: number;
  wipeKeys: ResolvedPublicKey[];
  wipeKeyThreshold: number;
  kycKeys: ResolvedPublicKey[];
  kycKeyThreshold: number;
  pauseKeys: ResolvedPublicKey[];
  pauseKeyThreshold: number;
  feeScheduleKeys: ResolvedPublicKey[];
  feeScheduleKeyThreshold: number;
  metadataKeys: ResolvedPublicKey[];
  metadataKeyThreshold: number;
  freezeDefault: boolean;
  finalMaxSupply?: bigint;
  autoRenewPeriodSeconds?: number;
  autoRenewAccountId?: string;
  expirationTime?: Date;
}

export interface TokenCreateFtBuildTransactionResult extends BaseBuildTransactionResult {}

export interface TokenCreateFtSignTransactionResult extends BaseSignTransactionResult {}

export interface TokenCreateFtExecuteTransactionResult {
  transactionResult: TransactionResult;
}

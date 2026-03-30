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
  autoRenewPeriodSeconds?: number;
  autoRenewAccountId?: string;
  expirationTime?: Date;
}

export interface TokenCreateFtBuildTransactionResult extends BaseBuildTransactionResult {}

export interface TokenCreateFtSignTransactionResult extends BaseSignTransactionResult {}

export interface TokenCreateFtExecuteTransactionResult {
  transactionResult: TransactionResult;
}

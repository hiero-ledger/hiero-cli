import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  TransactionResult,
} from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { TokenInfo } from '@/core/services/mirrornode/types';
import type { SupportedNetwork } from '@/core/types/shared.types';

export interface TokenUpdateNormalizedParams extends BaseNormalizedParams {
  tokenId: string;
  tokenInfo: TokenInfo;
  stateKey: string;
  network: SupportedNetwork;
  keyManager: KeyManager;
  newName?: string;
  newSymbol?: string;
  newTreasuryId?: string;
  adminKeyRefIds: string[];
  newTreasuryKeyRefId?: string;
  newAdminKeys: ResolvedPublicKey[] | null;
  newAdminKeyThreshold?: number;
  kycKeys: ResolvedPublicKey[] | null;
  kycKeyThreshold?: number;
  freezeKeys: ResolvedPublicKey[] | null;
  freezeKeyThreshold?: number;
  wipeKeys: ResolvedPublicKey[] | null;
  wipeKeyThreshold?: number;
  supplyKeys: ResolvedPublicKey[] | null;
  supplyKeyThreshold?: number;
  feeScheduleKeys: ResolvedPublicKey[] | null;
  feeScheduleKeyThreshold?: number;
  pauseKeys: ResolvedPublicKey[] | null;
  pauseKeyThreshold?: number;
  metadataKeys: ResolvedPublicKey[] | null;
  metadataKeyThreshold?: number;
  memo?: string | null;
  autoRenewAccountId?: string;
  autoRenewPeriodSeconds?: number;
  expirationTime?: Date;
  metadata?: Uint8Array;
}

export interface TokenUpdateBuildTransactionResult extends BaseBuildTransactionResult {}

export interface TokenUpdateSignTransactionResult extends BaseSignTransactionResult {}

export type TokenUpdateExecuteTransactionResult = TransactionResult;

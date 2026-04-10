import type { PublicKey } from '@hashgraph/sdk';
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
  adminKey?: ResolvedPublicKey;
  supplyKey?: ResolvedPublicKey;
  wipeKey?: ResolvedPublicKey;
  kycKey?: ResolvedPublicKey;
  freezeKey?: ResolvedPublicKey;
  pauseKey?: ResolvedPublicKey;
  feeScheduleKey?: ResolvedPublicKey;
  metadataKey?: ResolvedPublicKey;
  adminPublicKey?: PublicKey;
  supplyPublicKey?: PublicKey;
  wipePublicKey?: PublicKey;
  kycPublicKey?: PublicKey;
  freezePublicKey?: PublicKey;
  pausePublicKey?: PublicKey;
  feeSchedulePublicKey?: PublicKey;
  metadataPublicKey?: PublicKey;
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

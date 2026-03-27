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

export interface TokenCreateNftNormalizedParams extends BaseNormalizedParams {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: bigint;
  tokenType: HederaTokenType;
  supplyType: SupplyType;
  alias?: string;
  memo?: string;
  network: SupportedNetwork;
  keyManager: KeyManager;
  treasury: ResolvedAccountCredential;
  admin?: ResolvedPublicKey;
  supply?: ResolvedPublicKey;
  finalMaxSupply?: bigint;
}

export interface TokenCreateNftBuildTransactionResult extends BaseBuildTransactionResult {}

export interface TokenCreateNftSignTransactionResult extends BaseSignTransactionResult {}

export interface TokenCreateNftExecuteTransactionResult {
  transactionResult: TransactionResult;
}

import type { TransferTransaction } from '@hiero-ledger/sdk';
import type {
  BaseBuildTransactionResult,
  BaseExecuteTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
} from '@/core';
import type { ResolvedAccountCredential } from '@/core/services/key-resolver/types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';

export interface TransferNormalisedParams extends BaseNormalizedParams {
  amount: bigint;
  memo: string | undefined;
  keyManager: KeyManager;
  fromAccount: ResolvedAccountCredential;
  destination: string;
  currentNetwork: SupportedNetwork;
}

export interface TransferBuildTransactionResult extends BaseBuildTransactionResult {
  transaction: TransferTransaction;
}

export interface TransferSignTransactionResult extends BaseSignTransactionResult {}

export interface TransferExecuteTransactionResult extends BaseExecuteTransactionResult {}

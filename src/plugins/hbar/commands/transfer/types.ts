import type { TransferTransaction } from '@hashgraph/sdk';
import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
} from '@/core';
import type { ResolvedAccountCredential } from '@/core/services/key-resolver/types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@/core/types/shared.types';

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

export type TransferExecuteTransactionResult = TransactionResult;

import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  TransactionResult,
} from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';

export interface SubmitMessageNormalisedParams extends BaseNormalizedParams {
  topicId: string;
  message: string;
  signerKeyRefIds: string[];
  keyManager: KeyManager;
  currentNetwork: SupportedNetwork;
}

export interface SubmitMessageBuildTransactionResult extends BaseBuildTransactionResult {}

export interface SubmitMessageSignTransactionResult extends BaseSignTransactionResult {}

export type SubmitMessageExecuteTransactionResult = TransactionResult;

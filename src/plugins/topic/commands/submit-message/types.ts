import type { Transaction as HederaTransaction } from '@hashgraph/sdk';
import type { TransactionResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TopicData } from '@/plugins/topic/schema';

export interface SubmitMessageNormalisedParams {
  topicId: string;
  message: string;
  signerKeyRefId?: string;
  keyManager: KeyManagerName;
  currentNetwork: SupportedNetwork;
  topicData: TopicData;
}

export interface SubmitMessageBuildTransactionResult {
  transaction: HederaTransaction;
}

export interface SubmitMessageSignTransactionResult {
  transaction: HederaTransaction;
}

export type SubmitMessageExecuteTransactionResult = TransactionResult;

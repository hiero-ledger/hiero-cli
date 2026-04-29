import type {
  AccountUpdateTransaction,
  Transaction as HederaTransaction,
} from '@hiero-ledger/sdk';
import type { KeyAlgorithm } from '@/core/shared/constants';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@/core/types/shared.types';

export interface UpdateNormalisedParams {
  accountId: string;
  network: SupportedNetwork;
  accountStateKey: string;
  currentKeyRefId: string;
  newPublicKey?: string;
  newKeyRefId?: string;
  newKeyType?: KeyAlgorithm;
  memo?: string | null;
  maxAutoAssociations?: number;
  stakedAccountId?: string | null;
  stakedNodeId?: number | null;
  declineStakingReward?: boolean;
  autoRenewPeriod?: number;
  receiverSignatureRequired?: boolean;
  updatedFields: string[];
}

export interface UpdateBuildTransactionResult {
  transaction: AccountUpdateTransaction;
}

export interface UpdateSignTransactionResult {
  signedTransaction: HederaTransaction;
}

export type UpdateExecuteTransactionResult = TransactionResult;

import type { ContractUpdateTransaction, Transaction } from '@hashgraph/sdk';
import type { BaseNormalizedParams, KeyAlgorithm } from '@/core';
import type { ResolvedPublicKey } from '@/core/services/key-resolver/types';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@/core/types/shared.types';
import type { ContractData } from '@/plugins/contract/schema';

export interface ContractUpdateNormalisedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  stateKey: string;
  contractId: string;
  contractToUpdate: ContractData;
  signingKeyRefIds: string[];
  newAdminKeys: ResolvedPublicKey[] | undefined;
  newAdminKeyThreshold?: number;
  newKeyType?: KeyAlgorithm;
  memo?: string | null;
  autoRenewPeriod?: number;
  autoRenewAccountId?: string | null;
  maxAutomaticTokenAssociations?: number;
  stakedAccountId?: string;
  stakedNodeId?: number;
  declineStakingReward?: boolean;
  updatedFields: string[];
}

export interface ContractUpdateBuildTransactionResult {
  transaction: ContractUpdateTransaction;
}

export interface ContractUpdateSignTransactionResult {
  signedTransaction: Transaction;
}

export type ContractUpdateExecuteTransactionResult = TransactionResult;

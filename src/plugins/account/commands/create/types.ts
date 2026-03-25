import type {
  AccountCreateTransaction,
  Transaction as HederaTransaction,
} from '@hashgraph/sdk';
import type {
  BatchifyBuildTransactionResult,
  BatchifyNormalizedParams,
  BatchifySignTransactionResult,
} from '@/core';
import type { KeyAlgorithm } from '@/core/shared/constants';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@/core/types/shared.types';

export interface CreateNormalisedParams extends BatchifyNormalizedParams {
  balance: bigint;
  maxAutoAssociations: number;
  alias: string | undefined;
  name: string | undefined;
  publicKey: string;
  keyRefId: string;
  keyType: KeyAlgorithm;
  network: SupportedNetwork;
}

export interface CreateBuildTransactionResult extends BatchifyBuildTransactionResult {
  transaction: AccountCreateTransaction;
  publicKey: string;
}

export interface CreateSignTransactionResult extends BatchifySignTransactionResult {
  signedTransaction: HederaTransaction;
}

export type CreateExecuteTransactionResult = TransactionResult;

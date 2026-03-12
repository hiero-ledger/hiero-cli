import type {
  AccountCreateTransaction,
  Transaction as HederaTransaction,
} from '@hashgraph/sdk';
import type { KeyAlgorithm } from '@/core/shared/constants';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@/core/types/shared.types';

export interface CreateNormalisedParams {
  balance: bigint;
  maxAutoAssociations: number;
  alias: string | undefined;
  name: string | undefined;
  publicKey: string;
  keyRefId: string;
  keyType: KeyAlgorithm;
  network: SupportedNetwork;
}

export interface CreateBuildTransactionResult {
  transaction: AccountCreateTransaction;
  publicKey: string;
}

export interface CreateSignTransactionResult {
  signedTransaction: HederaTransaction;
}

export type CreateExecuteTransactionResult = TransactionResult;

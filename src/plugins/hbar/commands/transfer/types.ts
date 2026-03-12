import type {
  Transaction as HederaTransaction,
  TransferTransaction,
} from '@hashgraph/sdk';
import type { ResolvedAccountCredential } from '@/core/services/key-resolver/types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@/core/types/shared.types';

export interface TransferNormalisedParams {
  amount: bigint;
  memo: string | undefined;
  keyManager: KeyManager;
  fromAccount: ResolvedAccountCredential;
  destination: string;
  currentNetwork: SupportedNetwork;
}

export interface TransferBuildTransactionResult {
  transaction: TransferTransaction;
}

export interface TransferSignTransactionResult {
  signedTransaction: HederaTransaction;
}

export type TransferExecuteTransactionResult = TransactionResult;

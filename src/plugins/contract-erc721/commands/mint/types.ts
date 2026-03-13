import type { ContractExecuteTransaction, Transaction } from '@hashgraph/sdk';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@/core/types/shared.types';

export interface MintNormalisedParams {
  contractId: string;
  toEvmAddress: string;
  tokenId: number;
  gas: number;
  network: SupportedNetwork;
}

export interface MintBuildTransactionResult {
  transaction: ContractExecuteTransaction;
}

export interface MintSignTransactionResult {
  signedTransaction: Transaction;
}

export interface MintExecuteTransactionResult {
  transactionResult: TransactionResult;
}

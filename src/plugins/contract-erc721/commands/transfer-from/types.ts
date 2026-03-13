import type { ContractExecuteTransaction, Transaction } from '@hashgraph/sdk';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@/core/types/shared.types';

export interface TransferFromNormalisedParams {
  contractId: string;
  fromEvmAddress: string;
  toEvmAddress: string;
  tokenId: number;
  gas: number;
  network: SupportedNetwork;
}

export interface TransferFromBuildTransactionResult {
  transaction: ContractExecuteTransaction;
}

export interface TransferFromSignTransactionResult {
  signedTransaction: Transaction;
}

export interface TransferFromExecuteTransactionResult {
  transactionResult: TransactionResult;
}

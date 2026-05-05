import type {
  ContractExecuteTransaction,
  Transaction,
} from '@hiero-ledger/sdk';
import type { SupportedNetwork, TransactionResult } from '@/core';

export interface ContractErc20TransferFromNormalizedParams {
  contractId: string;
  gas: number;
  fromEvmAddress: string;
  toEvmAddress: string;
  value: number;
  network: SupportedNetwork;
}

export interface ContractErc20TransferFromBuildTransactionResult {
  transaction: ContractExecuteTransaction;
}

export interface ContractErc20TransferFromSignTransactionResult {
  signedTransaction: Transaction;
}

export interface ContractErc20TransferFromExecuteTransactionResult {
  transactionResult: TransactionResult;
}

import type { ContractExecuteTransaction, Transaction } from '@hashgraph/sdk';
import type { SupportedNetwork, TransactionResult } from '@/core';

export interface ContractErc20TransferNormalizedParams {
  contractId: string;
  gas: number;
  accountToEvmAddress: string;
  value: number;
  network: SupportedNetwork;
}

export interface ContractErc20TransferBuildTransactionResult {
  transaction: ContractExecuteTransaction;
}

export interface ContractErc20TransferSignTransactionResult {
  signedTransaction: Transaction;
}

export interface ContractErc20TransferExecuteTransactionResult {
  transactionResult: TransactionResult;
}

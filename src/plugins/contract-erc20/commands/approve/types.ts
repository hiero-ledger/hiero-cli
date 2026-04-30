import type {
  ContractExecuteTransaction,
  Transaction,
} from '@hiero-ledger/sdk';
import type { SupportedNetwork, TransactionResult } from '@/core';

export interface ContractErc20ApproveNormalizedParams {
  contractId: string;
  gas: number;
  spenderEvmAddress: string;
  value: number;
  network: SupportedNetwork;
}

export interface ContractErc20ApproveBuildTransactionResult {
  transaction: ContractExecuteTransaction;
}

export interface ContractErc20ApproveSignTransactionResult {
  signedTransaction: Transaction;
}

export interface ContractErc20ApproveExecuteTransactionResult {
  transactionResult: TransactionResult;
}

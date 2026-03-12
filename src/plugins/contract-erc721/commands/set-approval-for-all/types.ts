import type {
  ContractExecuteTransaction,
  Transaction as HederaTransaction,
} from '@hashgraph/sdk';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@/core/types/shared.types';

export interface SetApprovalForAllNormalisedParams {
  contractId: string;
  operatorEvmAddress: string;
  approved: boolean;
  gas: number;
  network: SupportedNetwork;
}

export interface SetApprovalForAllBuildTransactionResult {
  transaction: ContractExecuteTransaction;
}

export interface SetApprovalForAllSignTransactionResult {
  signedTransaction: HederaTransaction;
}

export interface SetApprovalForAllExecuteTransactionResult {
  transactionResult: TransactionResult;
}

import type {
  ContractExecuteTransaction,
  Transaction as HederaTransaction,
} from '@hashgraph/sdk';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@/core/types/shared.types';

export interface ApproveNormalisedParams {
  contractId: string;
  toEvmAddress: string;
  tokenId: number;
  gas: number;
  network: SupportedNetwork;
}

export interface ApproveBuildTransactionResult {
  transaction: ContractExecuteTransaction;
}

export interface ApproveSignTransactionResult {
  signedTransaction: HederaTransaction;
}

export interface ApproveExecuteTransactionResult {
  transactionResult: TransactionResult;
}

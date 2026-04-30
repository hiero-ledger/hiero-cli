import type {
  ContractExecuteTransaction,
  Transaction as HederaTransaction,
} from '@hiero-ledger/sdk';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@/core/types/shared.types';

export interface SafeTransferFromNormalisedParams {
  contractId: string;
  fromEvmAddress: string;
  toEvmAddress: string;
  tokenId: number;
  data?: string;
  gas: number;
  network: SupportedNetwork;
}

export interface SafeTransferFromBuildTransactionResult {
  transaction: ContractExecuteTransaction;
}

export interface SafeTransferFromSignTransactionResult {
  signedTransaction: HederaTransaction;
}

export interface SafeTransferFromExecuteTransactionResult {
  transactionResult: TransactionResult;
}

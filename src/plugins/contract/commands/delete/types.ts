import type {
  ContractDeleteTransaction,
  Transaction as HederaTransaction,
} from '@hiero-ledger/sdk';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@/core/types/shared.types';
import type { ContractData } from '@/plugins/contract/schema';

export interface ContractDeleteNormalisedParams {
  network: SupportedNetwork;
  stateKey: string;
  contractRef: string;
  contractToDelete: ContractData;
  transferAccountId?: string;
  transferContractId?: string;
  signingKeyRefIds: string[];
}

export interface ContractDeleteBuildTransactionResult {
  transaction: ContractDeleteTransaction;
}

export interface ContractDeleteSignTransactionResult {
  signedTransaction: HederaTransaction;
}

export type ContractDeleteExecuteTransactionResult = TransactionResult;

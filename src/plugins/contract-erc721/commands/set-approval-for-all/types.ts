import type {
  ContractExecuteTransaction,
  Transaction as HederaTransaction,
} from '@hiero-ledger/sdk';
import type { BaseExecuteTransactionResult } from '@/core';
import type { SupportedNetwork } from '@/core/types/shared.types';

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

export interface SetApprovalForAllExecuteTransactionResult extends BaseExecuteTransactionResult {}

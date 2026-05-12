import type {
  ContractExecuteTransaction,
  Transaction,
} from '@hiero-ledger/sdk';
import type { BaseExecuteTransactionResult } from '@/core';
import type { SupportedNetwork } from '@/core/types/shared.types';

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
  signedTransaction: Transaction;
}

export interface ApproveExecuteTransactionResult extends BaseExecuteTransactionResult {}

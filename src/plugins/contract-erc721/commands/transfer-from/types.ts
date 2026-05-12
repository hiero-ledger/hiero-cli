import type {
  ContractExecuteTransaction,
  Transaction,
} from '@hiero-ledger/sdk';
import type { BaseExecuteTransactionResult } from '@/core';
import type { SupportedNetwork } from '@/core/types/shared.types';

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

export interface TransferFromExecuteTransactionResult extends BaseExecuteTransactionResult {}

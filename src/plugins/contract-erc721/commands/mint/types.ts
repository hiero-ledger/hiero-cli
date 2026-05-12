import type {
  ContractExecuteTransaction,
  Transaction,
} from '@hiero-ledger/sdk';
import type { BaseExecuteTransactionResult } from '@/core';
import type { SupportedNetwork } from '@/core/types/shared.types';

export interface MintNormalisedParams {
  contractId: string;
  toEvmAddress: string;
  tokenId: number;
  gas: number;
  network: SupportedNetwork;
}

export interface MintBuildTransactionResult {
  transaction: ContractExecuteTransaction;
}

export interface MintSignTransactionResult {
  signedTransaction: Transaction;
}

export interface MintExecuteTransactionResult extends BaseExecuteTransactionResult {}

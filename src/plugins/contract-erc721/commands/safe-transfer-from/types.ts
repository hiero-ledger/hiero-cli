import type {
  ContractExecuteTransaction,
  Transaction as HederaTransaction,
} from '@hiero-ledger/sdk';
import type { BaseExecuteTransactionResult } from '@/core';
import type { SupportedNetwork } from '@/core/types/shared.types';

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

export interface SafeTransferFromExecuteTransactionResult extends BaseExecuteTransactionResult {}

import type { TransferTransaction } from '@hashgraph/sdk';

export enum SwapTransferType {
  HBAR = 'hbar',
  FT = 'ft',
}

export interface CreateHbarTransferParams {
  fromAccountId: string;
  toAccountId: string;
  amount: bigint;
  memo?: string;
}

export interface CreateFtTransferParams {
  fromAccountId: string;
  toAccountId: string;
  tokenId: string;
  amount: bigint;
}

export interface SwapTransferParams {
  type: SwapTransferType;
  fromAccountId: string;
  toAccountId: string;
  amount: bigint;
  tokenId?: string;
}

export interface CreateTransferTransactionResult {
  transaction: TransferTransaction;
}

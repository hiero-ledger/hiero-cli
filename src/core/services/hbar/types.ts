import type {
  AccountAllowanceApproveTransaction,
  TransferTransaction,
} from '@hashgraph/sdk';

export interface TransferTinybarParams {
  amount: bigint;
  from: string;
  to: string;
  memo?: string;
}

export interface TransferTinybarResult {
  transaction: TransferTransaction;
}

export interface HbarAllowanceParams {
  ownerAccountId: string;
  spenderAccountId: string;
  amountTinybar: bigint;
}

export interface HbarAllowanceResult {
  transaction: AccountAllowanceApproveTransaction;
}

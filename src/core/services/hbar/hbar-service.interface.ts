/**
 * HBAR Service Interface
 * Encapsulates HBAR-related operations
 */
import type {
  AccountAllowanceApproveTransaction,
  TransferTransaction,
} from '@hashgraph/sdk';

export interface HbarService {
  transferTinybar(
    params: TransferTinybarParams,
  ): Promise<TransferTinybarResult>;
  createHbarAllowanceTransaction(
    params: HbarAllowanceParams,
  ): HbarAllowanceResult;
}

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

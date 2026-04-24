import type { AccountAllowanceApproveTransaction } from '@hashgraph/sdk';
import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
} from '@/core';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@/core/types/shared.types';

export interface AllowanceNormalizedParams extends BaseNormalizedParams {
  ownerAccountId: string;
  spenderAccountId: string;
  amountTinybar: bigint;
  network: SupportedNetwork;
}

export interface AllowanceBuildTransactionResult extends BaseBuildTransactionResult {
  transaction: AccountAllowanceApproveTransaction;
}

export interface AllowanceSignTransactionResult extends BaseSignTransactionResult {}

export type AllowanceExecuteTransactionResult = TransactionResult;

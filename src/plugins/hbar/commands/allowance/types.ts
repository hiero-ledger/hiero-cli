import type { AccountAllowanceApproveTransaction } from '@hiero-ledger/sdk';
import type {
  BaseBuildTransactionResult,
  BaseExecuteTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
} from '@/core';
import type { SupportedNetwork } from '@/core/types/shared.types';

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

export interface AllowanceExecuteTransactionResult extends BaseExecuteTransactionResult {}

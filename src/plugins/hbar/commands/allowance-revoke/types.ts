import type { AccountAllowanceApproveTransaction } from '@hiero-ledger/sdk';
import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
} from '@/core';
import type {
  SupportedNetwork,
  TransactionResult,
} from '@/core/types/shared.types';

export interface AllowanceRevokeNormalizedParams extends BaseNormalizedParams {
  ownerAccountId: string;
  spenderAccountId: string;
  network: SupportedNetwork;
}

export interface AllowanceRevokeBuildTransactionResult extends BaseBuildTransactionResult {
  transaction: AccountAllowanceApproveTransaction;
}

export interface AllowanceRevokeSignTransactionResult extends BaseSignTransactionResult {}

export type AllowanceRevokeExecuteTransactionResult = TransactionResult;

import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';

export interface DeleteAllowanceNftNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  ownerAccountId: string;
  spenderAccountId: string | null;
  serials: number[] | null;
  allSerials: boolean;
  signerKeyRefId: string;
}

export interface DeleteAllowanceNftBuildTransactionResult extends BaseBuildTransactionResult {}

export interface DeleteAllowanceNftSignTransactionResult extends BaseSignTransactionResult {}

export interface DeleteAllowanceNftExecuteTransactionResult {
  transactionResult: TransactionResult;
}

import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';

export interface AllowanceNftNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  ownerAccountId: string;
  spenderAccountId: string;
  serials: number[] | null;
  allSerials: boolean;
  signerKeyRefId: string;
}

export interface AllowanceNftBuildTransactionResult extends BaseBuildTransactionResult {}

export interface AllowanceNftSignTransactionResult extends BaseSignTransactionResult {}

export interface AllowanceNftExecuteTransactionResult {
  transactionResult: TransactionResult;
}

import type {
  BaseBuildTransactionResult,
  BaseExecuteTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
} from '@/core';

export interface TransferNftNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  fromAccountId: string;
  toAccountId: string;
  serials: number[];
  signerKeyRefId: string;
}

export interface TransferNftBuildTransactionResult extends BaseBuildTransactionResult {}

export interface TransferNftSignTransactionResult extends BaseSignTransactionResult {}

export interface TransferNftExecuteTransactionResult extends BaseExecuteTransactionResult {}

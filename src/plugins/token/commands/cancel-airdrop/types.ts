import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';

export interface CancelAirdropNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  senderAccountId: string;
  receiverAccountId: string;
  serial: number | null;
  signerKeyRefId: string;
}

export interface CancelAirdropBuildTransactionResult extends BaseBuildTransactionResult {}

export interface CancelAirdropSignTransactionResult extends BaseSignTransactionResult {}

export interface CancelAirdropExecuteTransactionResult {
  transactionResult: TransactionResult;
}

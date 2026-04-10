import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';

export interface AirdropNftRecipient {
  accountId: string;
  serialNumbers: number[];
}

export interface TokenAirdropNftNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  fromAccountId: string;
  recipients: AirdropNftRecipient[];
  signerKeyRefId: string;
}

export interface TokenAirdropNftBuildTransactionResult extends BaseBuildTransactionResult {}

export interface TokenAirdropNftSignTransactionResult extends BaseSignTransactionResult {}

export interface TokenAirdropNftExecuteTransactionResult {
  transactionResult: TransactionResult;
}

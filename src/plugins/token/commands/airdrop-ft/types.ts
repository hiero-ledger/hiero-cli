import type {
  BaseBuildTransactionResult,
  BaseExecuteTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
} from '@/core';

export interface AirdropFtRecipient {
  accountId: string;
  rawAmount: bigint;
}

export interface TokenAirdropFtNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  tokenId: string;
  fromAccountId: string;
  recipients: AirdropFtRecipient[];
  signerKeyRefId: string;
}

export interface TokenAirdropFtBuildTransactionResult extends BaseBuildTransactionResult {}

export interface TokenAirdropFtSignTransactionResult extends BaseSignTransactionResult {}

export interface TokenAirdropFtExecuteTransactionResult extends BaseExecuteTransactionResult {}

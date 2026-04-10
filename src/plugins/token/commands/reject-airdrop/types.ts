import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';

export const MAX_REJECT_AIRDROPS = 10;

export type RejectAirdropType = 'FUNGIBLE' | 'NFT';

export interface RejectAirdropResolved {
  tokenId: string;
  tokenName: string;
  tokenSymbol: string;
  senderId: string;
  type: RejectAirdropType;
  amount?: number;
  serialNumber?: number;
}

export interface TokenRejectAirdropNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  ownerAccountId: string;
  signerKeyRefId: string;
  rejectItems: { tokenId: string; serialNumber?: number }[];
  resolvedAirdrops: RejectAirdropResolved[];
}

export interface TokenRejectAirdropBuildTransactionResult extends BaseBuildTransactionResult {}

export interface TokenRejectAirdropSignTransactionResult extends BaseSignTransactionResult {}

export interface TokenRejectAirdropExecuteTransactionResult {
  transactionResult: TransactionResult;
}

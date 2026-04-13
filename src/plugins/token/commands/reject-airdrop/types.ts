import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';
import type { RejectAirdropItem } from '@/core/types/token.types';

export type RejectAirdropType = 'FUNGIBLE' | 'NFT';

export interface RejectAirdropResolved {
  tokenId: string;
  tokenName: string;
  tokenSymbol: string;
  type: RejectAirdropType;
  serialNumbers?: number[];
}

export interface TokenRejectAirdropNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  ownerAccountId: string;
  signerKeyRefId: string;
  rejectItems: RejectAirdropItem[];
  resolvedAirdrop: RejectAirdropResolved;
}

export interface TokenRejectAirdropBuildTransactionResult extends BaseBuildTransactionResult {}

export interface TokenRejectAirdropSignTransactionResult extends BaseSignTransactionResult {}

export interface TokenRejectAirdropExecuteTransactionResult {
  transactionResult: TransactionResult;
}

import type {
  BaseBuildTransactionResult,
  BaseNormalizedParams,
  BaseSignTransactionResult,
  SupportedNetwork,
  TransactionResult,
} from '@/core';
import type { ClaimAirdropItem } from '@/core/types/token.types';

export const MAX_CLAIM_AIRDROPS = 10;

export type ClaimAirdropType = 'FUNGIBLE' | 'NFT';

export interface ClaimAirdropResolved {
  tokenId: string;
  tokenName: string;
  tokenSymbol: string;
  senderId: string;
  type: ClaimAirdropType;
  amount?: number;
  serialNumber?: number;
}

export interface TokenClaimAirdropNormalizedParams extends BaseNormalizedParams {
  network: SupportedNetwork;
  receiverAccountId: string;
  signerKeyRefId: string;
  claimItems: ClaimAirdropItem[];
  resolvedAirdrops: ClaimAirdropResolved[];
}

export interface TokenClaimAirdropBuildTransactionResult extends BaseBuildTransactionResult {}

export interface TokenClaimAirdropSignTransactionResult extends BaseSignTransactionResult {}

export interface TokenClaimAirdropExecuteTransactionResult {
  transactionResult: TransactionResult;
}

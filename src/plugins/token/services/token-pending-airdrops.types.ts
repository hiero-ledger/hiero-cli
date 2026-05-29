import type { SupportedNetwork } from '@/core/types/shared.types';

export type PendingAirdropType = 'FUNGIBLE' | 'NFT';

export interface PendingAirdropEntry {
  tokenId: string;
  tokenName: string;
  tokenSymbol: string;
  senderId: string;
  type: PendingAirdropType;
  amount?: number;
  serialNumber?: number;
}

export interface TokenPendingAirdropsResult {
  account: string;
  network: SupportedNetwork;
  airdrops: PendingAirdropEntry[];
  hasMore: boolean;
  total: number;
}

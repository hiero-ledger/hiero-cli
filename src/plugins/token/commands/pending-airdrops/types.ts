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

export interface PendingAirdropsNormalizedParams {
  account: string;
  showAll: boolean;
}

/**
 * Auction Log Plugin Types
 *
 * Types for the BlindBid auction audit trail plugin.
 * Commitments are published to HCS topics — they prove timing and
 * ordering of auction events without revealing any business data.
 */

export type AuctionStage =
  | 'created'
  | 'bidding-open'
  | 'bidding-closed'
  | 'awarded'
  | 'settled'
  | 'disputed';

export const VALID_STAGES: AuctionStage[] = [
  'created',
  'bidding-open',
  'bidding-closed',
  'awarded',
  'settled',
  'disputed',
];

export interface AuditCommitment {
  auctionId: string;
  stage: AuctionStage;
  cantonRef: string;
  adiTx: string;
  timestamp: string;
  nonce: string;
  commitmentHash: string;
}

export interface AuditLogEntry extends AuditCommitment {
  topicId: string;
  sequenceNumber: number;
  network: string;
}

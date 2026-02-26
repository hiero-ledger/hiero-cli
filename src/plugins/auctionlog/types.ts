/**
 * Auction Log Plugin Types
 *
 * Types for the auctionlog audit trail plugin.
 * Commitments are published to HCS topics — they prove timing and
 * ordering of auction events without revealing any business data.
 */

/**
 * Valid auction lifecycle stages in chronological order.
 * The STAGE_ORDER map encodes the expected sequence.
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

/**
 * Ordinal position of each stage. Used for enforcing chronological
 * ordering (except 'disputed', which may occur at any point).
 */
export const STAGE_ORDER: Record<AuctionStage, number> = {
  'created': 0,
  'bidding-open': 1,
  'bidding-closed': 2,
  'awarded': 3,
  'settled': 4,
  'disputed': 5,
};

/**
 * Core commitment fields that are hashed together.
 * The hash is published on-chain; these fields stay private.
 */
export interface AuditCommitment {
  auctionId: string;
  stage: AuctionStage;
  metadata: string;
  timestamp: string;
  nonce: string;
  commitmentHash: string;
}

/**
 * Full audit log entry stored in local state.
 * Extends AuditCommitment with HCS-specific fields.
 */
export interface AuditLogEntry extends AuditCommitment {
  topicId: string;
  sequenceNumber: number;
  network: string;
}

/**
 * Auction-level metadata pointer stored in state.
 */
export interface AuctionMeta {
  topicId: string;
  lastStage: AuctionStage;
  lastUpdated: string;
}

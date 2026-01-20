/**
 * Token Transaction Type Definitions
 * Type definitions for token-related operations
 */

import type { PublicKey } from '@hashgraph/sdk';
import type { HederaTokenType } from '@/core/shared/constants';

/**
 * Parameters for token transfer transactions
 */
export interface TokenTransferParams {
  tokenId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: bigint;
}

/**
 * Custom fee configuration for tokens
 */
export interface CustomFee {
  type: 'fixed'; // Only fixed fees supported
  amount: number; // Required for fixed fees
  unitType?: 'HBAR'; // Only HBAR supported, defaults to HBAR
  collectorId?: string;
  exempt?: boolean;
}

export type SupplyType = 'FINITE' | 'INFINITE';

/**
 * Parameters for token creation transactions
 */
export interface TokenCreateParams {
  name: string;
  symbol: string;
  treasuryId: string;
  decimals: number;
  initialSupplyRaw: bigint;
  tokenType: HederaTokenType;
  supplyType: SupplyType;
  maxSupplyRaw?: bigint; // Required for FINITE supply type
  adminPublicKey: PublicKey;
  supplyPublicKey?: PublicKey;
  wipePublicKey?: PublicKey;
  kycPublicKey?: PublicKey;
  freezePublicKey?: PublicKey;
  pausePublicKey?: PublicKey;
  feeSchedulePublicKey?: PublicKey;
  customFees?: CustomFee[];
  memo?: string;
}

/**
 * Parameters for token association transactions
 */
export interface TokenAssociationParams {
  tokenId: string;
  accountId: string;
}

/**
 * Parameters for FT token mint transactions
 */
export interface TokenMintFtParams {
  tokenId: string;
  amount: bigint;
}

/**
 * Parameters for NFT mint transactions
 */
export interface TokenMintNftParams {
  tokenId: string;
  metadata: Uint8Array;
}

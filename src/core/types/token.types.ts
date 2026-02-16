/**
 * Token Transaction Type Definitions
 * Type definitions for token-related operations
 */

import type { PublicKey } from '@hashgraph/sdk';
import type { HederaTokenType } from '@/core/shared/constants';
import type { SupplyType } from '@/core/types/shared.types';

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
export enum CustomFeeType {
  FIXED = 'fixed',
  FRACTIONAL = 'fractional',
}

export enum FixedFeeUnitType {
  HBAR = 'HBAR',
  TOKEN = 'TOKEN',
}

export interface FixedFee {
  type: CustomFeeType.FIXED;
  amount: number;
  unitType: FixedFeeUnitType;
  collectorId: string;
  exempt: boolean;
}

export interface FractionalFee {
  type: CustomFeeType.FRACTIONAL;
  numerator: number;
  denominator: number;
  min?: number;
  max?: number;
  netOfTransfers: boolean;
  collectorId: string;
  exempt: boolean;
}

export type CustomFee = FixedFee | FractionalFee;

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
 * Parameters for token mint transactions (FT or NFT)
 * Either amount (for FT) or metadata (for NFT) must be provided
 */
export interface TokenMintParams {
  tokenId: string;
  amount?: bigint; // Required for FT minting
  metadata?: Uint8Array; // Required for NFT minting
}

/**
 * Parameters for NFT transfer transactions
 */
export interface NftTransferParams {
  tokenId: string;
  fromAccountId: string;
  toAccountId: string;
  serialNumbers: number[];
}

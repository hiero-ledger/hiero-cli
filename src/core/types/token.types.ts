/**
 * Token Transaction Type Definitions
 * Type definitions for token-related operations
 */

import type { Key } from '@hashgraph/sdk';
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
  adminKey?: Key;
  supplyKey?: Key;
  wipeKey?: Key;
  kycKey?: Key;
  freezeKey?: Key;
  freezeDefault?: boolean;
  pauseKey?: Key;
  feeScheduleKey?: Key;
  metadataKey?: Key;
  autoRenewPeriod?: number;
  autoRenewAccountId?: string;
  expirationTime?: Date;
  customFees?: CustomFee[];
  memo?: string;
  autoRenewPeriodSeconds?: number;
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

export interface TokenDeleteParams {
  tokenId: string;
}

export interface TokenFreezeParams {
  tokenId: string;
  accountId: string;
}

export interface TokenUnfreezeParams {
  tokenId: string;
  accountId: string;
}

export interface TokenBurnFtParams {
  tokenId: string;
  amount: bigint;
}

export interface TokenBurnNftParams {
  tokenId: string;
  serialNumbers: number[];
}

export interface TokenUpdateNftMetadataParams {
  tokenId: string;
  serialNumbers: number[];
  metadata: Uint8Array;
}

/**
 * Parameters for approving NFT allowance for specific serial numbers
 */
export interface NftAllowanceApproveSpecificParams {
  tokenId: string;
  ownerAccountId: string;
  spenderAccountId: string;
  serialNumbers: number[];
  allSerials?: false;
}

/**
 * Parameters for approving NFT allowance for all serials in a collection
 */
export interface NftAllowanceApproveAllSerialsParams {
  tokenId: string;
  ownerAccountId: string;
  spenderAccountId: string;
  allSerials: true;
}

export type NftAllowanceApproveParams =
  | NftAllowanceApproveSpecificParams
  | NftAllowanceApproveAllSerialsParams;

export interface NftAllowanceDeleteSpecificParams {
  tokenId: string;
  ownerAccountId: string;
  serialNumbers: number[];
  allSerials?: false;
}

export interface NftAllowanceDeleteAllSerialsParams {
  tokenId: string;
  ownerAccountId: string;
  spenderAccountId: string;
  allSerials: true;
}

export type NftAllowanceDeleteParams =
  | NftAllowanceDeleteSpecificParams
  | NftAllowanceDeleteAllSerialsParams;

export interface TokenAllowanceFtParams {
  tokenId: string;
  ownerAccountId: string;
  spenderAccountId: string;
  amount: bigint;
}

export interface TokenAirdropFtTransfer {
  recipientAccountId: string;
  amount: bigint;
}

export interface TokenAirdropFtParams {
  tokenId: string;
  senderAccountId: string;
  transfers: TokenAirdropFtTransfer[];
}

export interface TokenAirdropNftTransfer {
  recipientAccountId: string;
  serialNumbers: number[];
}

export interface TokenAirdropNftParams {
  tokenId: string;
  senderAccountId: string;
  transfers: TokenAirdropNftTransfer[];
}

export interface ClaimAirdropItem {
  tokenId: string;
  senderAccountId: string;
  receiverAccountId: string;
  serialNumber?: number;
}

export interface TokenClaimAirdropParams {
  items: ClaimAirdropItem[];
}

export interface TokenCancelAirdropParams {
  senderAccountId: string;
  receiverAccountId: string;
  tokenId: string;
  serial?: number;
}

export enum AirdropTokenType {
  FUNGIBLE = 'FUNGIBLE',
  NFT = 'NFT',
}

export interface RejectAirdropItem {
  tokenId: string;
  serialNumber?: number; // undefined for FT
}

export interface TokenRejectAirdropParams {
  ownerAccountId: string;
  items: RejectAirdropItem[];
}

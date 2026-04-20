import type { TransactionResult } from '@/core';
import type { HederaTokenType } from '@/core/shared/constants';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TokenCreateFtFromFileNormalizedParams } from '@/plugins/token/commands/create-ft-from-file/types';
import type { TokenCreateNftFromFileNormalizedParams } from '@/plugins/token/commands/create-nft-from-file/types';
import type { TokenData } from '@/plugins/token/schema';

import { ValidationError } from '@/core/errors';
import { HederaTokenType as HederaTokenTypeValues } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';

export interface TokenKeyRefIdsWithThreshold {
  adminKeyRefIds?: string[];
  adminKeyThreshold?: number;
  supplyKeyRefIds?: string[];
  supplyKeyThreshold?: number;
  wipeKeyRefIds?: string[];
  wipeKeyThreshold?: number;
  kycKeyRefIds?: string[];
  kycKeyThreshold?: number;
  freezeKeyRefIds?: string[];
  freezeKeyThreshold?: number;
  pauseKeyRefIds?: string[];
  pauseKeyThreshold?: number;
  feeScheduleKeyRefIds?: string[];
  feeScheduleKeyThreshold?: number;
  metadataKeyRefIds?: string[];
  metadataKeyThreshold?: number;
}

export function buildTokenData(
  result: TransactionResult,
  params: {
    name: string;
    symbol: string;
    treasuryId: string;
    decimals: number;
    initialSupply: bigint;
    tokenType: HederaTokenType;
    supplyType: string;
    network: SupportedNetwork;
  } & TokenKeyRefIdsWithThreshold,
): TokenData {
  return {
    tokenId: result.tokenId ?? '',
    name: params.name,
    symbol: params.symbol,
    treasuryId: params.treasuryId,
    decimals: params.decimals,
    initialSupply: params.initialSupply,
    tokenType: params.tokenType,
    supplyType: params.supplyType.toUpperCase() as SupplyType,
    maxSupply:
      (params.supplyType.toUpperCase() as SupplyType) === SupplyType.FINITE
        ? params.initialSupply
        : 0n,
    adminKeyRefIds: params.adminKeyRefIds ?? [],
    adminKeyThreshold: params.adminKeyThreshold ?? 0,
    supplyKeyRefIds: params.supplyKeyRefIds ?? [],
    supplyKeyThreshold: params.supplyKeyThreshold ?? 0,
    wipeKeyRefIds: params.wipeKeyRefIds ?? [],
    wipeKeyThreshold: params.wipeKeyThreshold ?? 0,
    kycKeyRefIds: params.kycKeyRefIds ?? [],
    kycKeyThreshold: params.kycKeyThreshold ?? 0,
    freezeKeyRefIds: params.freezeKeyRefIds ?? [],
    freezeKeyThreshold: params.freezeKeyThreshold ?? 0,
    pauseKeyRefIds: params.pauseKeyRefIds ?? [],
    pauseKeyThreshold: params.pauseKeyThreshold ?? 0,
    feeScheduleKeyRefIds: params.feeScheduleKeyRefIds ?? [],
    feeScheduleKeyThreshold: params.feeScheduleKeyThreshold ?? 0,
    metadataKeyRefIds: params.metadataKeyRefIds ?? [],
    metadataKeyThreshold: params.metadataKeyThreshold ?? 0,
    network: params.network,
    associations: [],
    customFees: [],
  };
}

function extractKeyRefIds(keys: { keyRefId: string }[]): string[] {
  return keys.map((k) => k.keyRefId);
}

export function buildTokenDataFromFile(
  result: TransactionResult,
  normalisedParams: TokenCreateFtFromFileNormalizedParams,
): TokenData {
  return {
    tokenId: result.tokenId ?? '',
    name: normalisedParams.name,
    symbol: normalisedParams.symbol,
    treasuryId: normalisedParams.treasury.accountId,
    adminKeyRefIds: extractKeyRefIds(normalisedParams.adminKeys),
    adminKeyThreshold: normalisedParams.adminKeyThreshold,
    supplyKeyRefIds: extractKeyRefIds(normalisedParams.supplyKeys),
    supplyKeyThreshold: normalisedParams.supplyKeyThreshold,
    wipeKeyRefIds: extractKeyRefIds(normalisedParams.wipeKeys),
    wipeKeyThreshold: normalisedParams.wipeKeyThreshold,
    kycKeyRefIds: extractKeyRefIds(normalisedParams.kycKeys),
    kycKeyThreshold: normalisedParams.kycKeyThreshold,
    freezeKeyRefIds: extractKeyRefIds(normalisedParams.freezeKeys),
    freezeKeyThreshold: normalisedParams.freezeKeyThreshold,
    pauseKeyRefIds: extractKeyRefIds(normalisedParams.pauseKeys),
    pauseKeyThreshold: normalisedParams.pauseKeyThreshold,
    feeScheduleKeyRefIds: extractKeyRefIds(normalisedParams.feeScheduleKeys),
    feeScheduleKeyThreshold: normalisedParams.feeScheduleKeyThreshold,
    metadataKeyRefIds: extractKeyRefIds(normalisedParams.metadataKeys),
    metadataKeyThreshold: normalisedParams.metadataKeyThreshold,
    decimals: normalisedParams.decimals,
    initialSupply: normalisedParams.initialSupply,
    tokenType: normalisedParams.tokenType,
    supplyType: normalisedParams.supplyType,
    maxSupply: normalisedParams.maxSupply,
    network: normalisedParams.network,
    associations: [],
    customFees: normalisedParams.customFees,
    memo: normalisedParams.memo,
  };
}

export function buildNftTokenDataFromFile(
  result: TransactionResult,
  normalisedParams: TokenCreateNftFromFileNormalizedParams,
): TokenData {
  return {
    tokenId: result.tokenId ?? '',
    name: normalisedParams.name,
    symbol: normalisedParams.symbol,
    treasuryId: normalisedParams.treasury.accountId,
    adminKeyRefIds: extractKeyRefIds(normalisedParams.adminKeys),
    adminKeyThreshold: normalisedParams.adminKeyThreshold,
    supplyKeyRefIds: extractKeyRefIds(normalisedParams.supplyKeys),
    supplyKeyThreshold: normalisedParams.supplyKeyThreshold,
    wipeKeyRefIds: extractKeyRefIds(normalisedParams.wipeKeys),
    wipeKeyThreshold: normalisedParams.wipeKeyThreshold,
    kycKeyRefIds: extractKeyRefIds(normalisedParams.kycKeys),
    kycKeyThreshold: normalisedParams.kycKeyThreshold,
    freezeKeyRefIds: extractKeyRefIds(normalisedParams.freezeKeys),
    freezeKeyThreshold: normalisedParams.freezeKeyThreshold,
    pauseKeyRefIds: extractKeyRefIds(normalisedParams.pauseKeys),
    pauseKeyThreshold: normalisedParams.pauseKeyThreshold,
    feeScheduleKeyRefIds: extractKeyRefIds(normalisedParams.feeScheduleKeys),
    feeScheduleKeyThreshold: normalisedParams.feeScheduleKeyThreshold,
    metadataKeyRefIds: [],
    metadataKeyThreshold: 0,
    decimals: 0,
    initialSupply: 0n,
    tokenType: HederaTokenTypeValues.NON_FUNGIBLE_TOKEN,
    supplyType: normalisedParams.supplyType,
    maxSupply: normalisedParams.maxSupply ?? 0n,
    network: normalisedParams.network,
    associations: [],
    customFees: [],
    memo: normalisedParams.memo,
  };
}

export function determineFiniteMaxSupply(
  maxSupply: bigint | undefined,
  initialSupply: bigint,
): bigint {
  if (maxSupply !== undefined) {
    if (maxSupply < initialSupply) {
      throw new ValidationError(
        'Max supply cannot be less than initial supply',
        { context: { maxSupply, initialSupply } },
      );
    }
    return maxSupply;
  }
  return initialSupply;
}

import type { TransactionResult } from '@/core';
import type { HederaTokenType } from '@/core/shared/constants';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type {
  FungibleTokenFileDefinition,
  NonFungibleTokenFileDefinition,
  TokenData,
} from '@/plugins/token/schema';

import { ValidationError } from '@/core/errors';
import { HederaTokenType as HederaTokenTypeValues } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';

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
    adminPublicKey: string;
    supplyPublicKey?: string;
    network: SupportedNetwork;
  },
): TokenData {
  return {
    tokenId: result.tokenId!,
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
    adminPublicKey: params.adminPublicKey,
    supplyPublicKey: params?.supplyPublicKey,
    network: params.network,
    associations: [],
    customFees: [],
  };
}

export interface TokenKeyOptions {
  supplyPublicKey?: string;
  wipePublicKey?: string;
  kycPublicKey?: string;
  freezePublicKey?: string;
  pausePublicKey?: string;
  feeSchedulePublicKey?: string;
}

export function buildTokenDataFromFile(
  result: TransactionResult,
  tokenDefinition: FungibleTokenFileDefinition,
  treasuryId: string,
  adminPublicKey: string,
  network: SupportedNetwork,
  keys?: TokenKeyOptions,
): TokenData {
  return {
    tokenId: result.tokenId!,
    name: tokenDefinition.name,
    symbol: tokenDefinition.symbol,
    treasuryId,
    adminPublicKey,
    supplyPublicKey: keys?.supplyPublicKey,
    wipePublicKey: keys?.wipePublicKey,
    kycPublicKey: keys?.kycPublicKey,
    freezePublicKey: keys?.freezePublicKey,
    pausePublicKey: keys?.pausePublicKey,
    feeSchedulePublicKey: keys?.feeSchedulePublicKey,
    decimals: tokenDefinition.decimals,
    initialSupply: tokenDefinition.initialSupply,
    tokenType: tokenDefinition.tokenType,
    supplyType: tokenDefinition.supplyType.toUpperCase() as SupplyType,
    maxSupply: tokenDefinition.maxSupply,
    network,
    associations: [],
    customFees: tokenDefinition.customFees.map((fee) => ({
      type: fee.type,
      amount: fee.amount,
      unitType: fee.unitType,
      collectorId: fee.collectorId,
      exempt: fee.exempt,
    })),
    memo: tokenDefinition.memo,
  };
}

export function buildNftTokenDataFromFile(
  result: TransactionResult,
  tokenDefinition: NonFungibleTokenFileDefinition,
  treasuryId: string,
  adminPublicKey: string,
  supplyPublicKey: string,
  network: SupportedNetwork,
  keys?: Omit<TokenKeyOptions, 'supplyPublicKey'>,
): TokenData {
  return {
    tokenId: result.tokenId!,
    name: tokenDefinition.name,
    symbol: tokenDefinition.symbol,
    treasuryId,
    adminPublicKey,
    supplyPublicKey,
    wipePublicKey: keys?.wipePublicKey,
    kycPublicKey: keys?.kycPublicKey,
    freezePublicKey: keys?.freezePublicKey,
    pausePublicKey: keys?.pausePublicKey,
    feeSchedulePublicKey: keys?.feeSchedulePublicKey,
    decimals: 0,
    initialSupply: 0n,
    tokenType: HederaTokenTypeValues.NON_FUNGIBLE_TOKEN,
    supplyType: tokenDefinition.supplyType.toUpperCase() as SupplyType,
    maxSupply: tokenDefinition.maxSupply ?? 0n,
    network,
    associations: [],
    customFees: [],
    memo: tokenDefinition.memo,
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

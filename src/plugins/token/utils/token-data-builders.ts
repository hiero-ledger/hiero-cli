import type { TransactionResult } from '@/core';
import type { HederaTokenType } from '@/core/shared/constants';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TokenCreateFtFromFileNormalizedParams } from '@/plugins/token/commands/create-ft-from-file/types';
import type { TokenCreateNftFromFileNormalizedParams } from '@/plugins/token/commands/create-nft-from-file/types';
import type { TokenData } from '@/plugins/token/schema';

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
    adminPublicKey?: string;
    supplyPublicKey?: string;
    freezePublicKey?: string;
    wipePublicKey?: string;
    pausePublicKey?: string;
    kycPublicKey?: string;
    feeSchedulePublicKey?: string;
    metadataPublicKey?: string;
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
    supplyPublicKey: params.supplyPublicKey,
    freezePublicKey: params.freezePublicKey,
    wipePublicKey: params.wipePublicKey,
    pausePublicKey: params.pausePublicKey,
    kycPublicKey: params.kycPublicKey,
    feeSchedulePublicKey: params.feeSchedulePublicKey,
    metadataPublicKey: params.metadataPublicKey,
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
  metadataPublicKey?: string;
}

export function buildTokenDataFromFile(
  result: TransactionResult,
  normalisedParams: TokenCreateFtFromFileNormalizedParams,
): TokenData {
  return {
    tokenId: result.tokenId!,
    name: normalisedParams.name,
    symbol: normalisedParams.symbol,
    treasuryId: normalisedParams.treasury.accountId,
    adminPublicKey: normalisedParams.adminKey?.publicKey,
    supplyPublicKey: normalisedParams.supplyKey?.publicKey,
    wipePublicKey: normalisedParams.wipeKey?.publicKey,
    kycPublicKey: normalisedParams.kycKey?.publicKey,
    freezePublicKey: normalisedParams.freezeKey?.publicKey,
    pausePublicKey: normalisedParams.pauseKey?.publicKey,
    feeSchedulePublicKey: normalisedParams.feeScheduleKey?.publicKey,
    metadataPublicKey: normalisedParams.metadataKey?.publicKey,
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
    tokenId: result.tokenId!,
    name: normalisedParams.name,
    symbol: normalisedParams.symbol,
    treasuryId: normalisedParams.treasury.accountId,
    adminPublicKey: normalisedParams.adminKey.publicKey,
    supplyPublicKey: normalisedParams.supplyKey.publicKey,
    wipePublicKey: normalisedParams.wipeKey?.publicKey,
    kycPublicKey: normalisedParams.kycKey?.publicKey,
    freezePublicKey: normalisedParams.freezeKey?.publicKey,
    pausePublicKey: normalisedParams.pauseKey?.publicKey,
    feeSchedulePublicKey: normalisedParams.feeScheduleKey?.publicKey,
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

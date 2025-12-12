/**
 * Token Data Builders
 * Utility functions for building token data objects for state storage
 */
import type { TransactionResult } from '@/core';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { TokenData, TokenFileDefinition } from '@/plugins/token/schema';

export function buildTokenData(
  result: TransactionResult,
  params: {
    name: string;
    symbol: string;
    treasuryId: string;
    decimals: number;
    initialSupply: bigint;
    supplyType: string;
    adminPublicKey: string;
    treasuryPublicKey?: string;
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
    supplyType: params.supplyType.toUpperCase() as 'FINITE' | 'INFINITE',
    maxSupply:
      params.supplyType.toUpperCase() === 'FINITE' ? params.initialSupply : 0n,
    adminPublicKey: params.adminPublicKey,
    network: params.network,
    associations: [],
    customFees: [],
  };
}

export function buildTokenDataFromFile(
  result: TransactionResult,
  tokenDefinition: TokenFileDefinition,
  treasuryId: string,
  adminPublicKey: string,
  network: SupportedNetwork,
): TokenData {
  return {
    tokenId: result.tokenId!,
    name: tokenDefinition.name,
    symbol: tokenDefinition.symbol,
    treasuryId,
    adminPublicKey,
    decimals: tokenDefinition.decimals,
    initialSupply: tokenDefinition.initialSupply,
    supplyType: tokenDefinition.supplyType.toUpperCase() as
      | 'FINITE'
      | 'INFINITE',
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

export function determineFiniteMaxSupply(
  maxSupply: bigint | undefined,
  initialSupply: bigint,
): bigint {
  if (maxSupply !== undefined) {
    if (maxSupply < initialSupply) {
      throw new Error(
        `Max supply (${maxSupply}) cannot be less than initial supply (${initialSupply})`,
      );
    }
    return maxSupply;
  }
  return initialSupply;
}

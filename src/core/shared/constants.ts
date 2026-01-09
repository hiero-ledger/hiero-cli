import { TokenType } from '@hashgraph/sdk';

export const HBAR_DECIMALS = 8;
export const TOKEN_BALANCE_LIMIT = 9_223_372_036_854_775_807n; // Based on TokenCreateTransactionBody from hashgraph protobufs docs max limit for token initial supply is 2^63 - 1

export enum Status {
  Success = 'success',
  Failure = 'failure',
}

export const PLUGIN_MANAGEMENT_NAMESPACE = 'plugin-management';

/**
 * Key Algorithm Enum
 * Used throughout the codebase to avoid string literal duplication
 */
export enum KeyAlgorithm {
  ECDSA = 'ecdsa',
  ED25519 = 'ed25519',
}

export enum TokenTypeEnum {
  NON_FUNGIBLE_TOKEN = 'NonFungibleToken',
  FUNGIBLE_COMMON = 'FungibleCommon',
}

export const TokenTypeMap = {
  [TokenTypeEnum.NON_FUNGIBLE_TOKEN]: TokenType.NonFungibleUnique,
  [TokenTypeEnum.FUNGIBLE_COMMON]: TokenType.FungibleCommon,
} satisfies Record<TokenTypeEnum, TokenType>;

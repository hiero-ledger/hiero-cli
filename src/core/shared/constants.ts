import { TokenType } from '@hiero-ledger/sdk';

export const HBAR_DECIMALS = 8;
export const TOKEN_BALANCE_LIMIT = 9_223_372_036_854_775_807n; // Based on TokenCreateTransactionBody from hashgraph protobufs docs max limit for token initial supply is 2^63 - 1
export const NFT_BALANCE_PAGE_SIZE = 100;

export const HASHSCAN_BASE_URL = 'https://hashscan.io/';

export const HASHSCAN_VERIFY_ORIGIN = 'https://server-verify.hashscan.io';

export const HASHSCAN_VERIFICATION_STATUS_PERFECT = 'perfect';

export enum Status {
  Success = 'success',
  Failure = 'failure',
}

export const NULL_TOKEN = 'null';

export const PLUGIN_MANAGEMENT_NAMESPACE = 'plugin-management';

export const PLUGIN_INITIALIZED_DEFAULTS_KEY = 'initialized-defaults';

/**
 * Key Algorithm Enum
 * Used throughout the codebase to avoid string literal duplication
 */
export enum KeyAlgorithm {
  ECDSA = 'ecdsa',
  ED25519 = 'ed25519',
}

export enum HederaTokenType {
  NON_FUNGIBLE_TOKEN = 'NonFungibleToken',
  FUNGIBLE_COMMON = 'FungibleCommon',
}

export const TokenTypeMap = {
  [HederaTokenType.NON_FUNGIBLE_TOKEN]: TokenType.NonFungibleUnique,
  [HederaTokenType.FUNGIBLE_COMMON]: TokenType.FungibleCommon,
} satisfies Record<HederaTokenType, TokenType>;

export const MirrorTokenTypeToHederaTokenType = {
  [TokenType.FungibleCommon.toString()]: HederaTokenType.FUNGIBLE_COMMON,
  [TokenType.NonFungibleUnique.toString()]: HederaTokenType.NON_FUNGIBLE_TOKEN,
} satisfies Record<string, HederaTokenType>;

export const MINUTE_IN_SECONDS = 60;
export const HOUR_IN_SECONDS = 60 * MINUTE_IN_SECONDS;
export const DAY_IN_SECONDS = 24 * HOUR_IN_SECONDS;

export const HEDERA_AUTO_RENEW_PERIOD_MIN = 30 * DAY_IN_SECONDS; // 30 days
export const HEDERA_AUTO_RENEW_PERIOD_MAX = 92 * DAY_IN_SECONDS; // 92 days (per network rules)
export const HEDERA_EXPIRATION_TIME_MAX = 92 * DAY_IN_SECONDS * 1000; // 92 days (per network rules)
export const HEDERA_SCHEDULE_EXPIRATION_MAX = 62 * DAY_IN_SECONDS * 1000; // 92 days (per network rules)

// HIP-336: max 20 allowance operations (HBAR + FT + NFT combined) per AccountAllowanceApproveTransaction
export const HEDERA_MAX_ALLOWANCE_ENTRIES_PER_TRANSACTION = 20;

// Hedera SDK limit: max 10 token transfers per TransferTransaction
export const HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION = 10;

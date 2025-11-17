export const HBAR_DECIMALS = 8;

export enum Status {
  Success = 'success',
  Failure = 'failure',
}

/**
 * Key Algorithm Enum
 * Used throughout the codebase to avoid string literal duplication
 */
export enum KeyAlgorithm {
  ECDSA = 'ecdsa',
  ED25519 = 'ed25519',
}

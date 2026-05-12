/**
 * Encryption algorithm configuration.
 *
 * Defines cryptographic parameters for encryption algorithms.
 * This serves as the single source of truth for algorithm requirements,
 * ensuring consistency between EncryptionService and KeyProvider.
 */
export interface AlgorithmConfig {
  readonly name: string;
  readonly keyLengthBytes: number;
  readonly initVectorLengthBytes: number;
  readonly identifier: string;
}

/**
 * Registry of supported encryption algorithms.
 *
 * Currently supports:
 * - AES-256-GCM: Authenticated encryption with 256-bit keys
 */
export const ALGORITHM_CONFIGS = {
  AES_256_GCM: {
    name: 'aes-256-gcm',
    keyLengthBytes: 32,
    initVectorLengthBytes: 16,
    identifier: 'aes-256-gcm',
  },
} satisfies Record<string, AlgorithmConfig>;

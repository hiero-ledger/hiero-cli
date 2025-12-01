/**
 * Key Utilities
 * Utilities for parsing, validating, and converting cryptographic keys
 */
import { PrivateKey } from '@hashgraph/sdk';
import type { KeyAlgorithmType as KeyAlgorithmType } from '../services/kms/kms-types.interface';
import { KeyAlgorithm } from '../shared/constants';
import { PrivateKeyWithTypeSchema } from '../schemas/common-schemas';

/**
 * Parse a private key string, trying multiple formats (ED25519, ECDSA, DER)
 * @param privateKeyString - The private key as a string
 * @returns PrivateKey object
 * @throws Error if the key cannot be parsed in any supported format
 */
export function parsePrivateKey(privateKeyString: string): PrivateKey {
  const parsers = [
    // TODO: ED25519 support
    // (key: string) => PrivateKey.fromStringED25519(key),
    (key: string) => PrivateKey.fromStringECDSA(key),
    (key: string) => PrivateKey.fromStringDer(key),
  ];

  for (const parser of parsers) {
    try {
      return parser(privateKeyString);
    } catch {
      // Continue to next parser
    }
  }

  throw new Error(
    `Invalid private key format. Key must be in ED25519, ECDSA, or DER format: ${privateKeyString.substring(
      0,
      10,
    )}...`,
  );
}

/**
 * Get the public key from a private key string
 * @param privateKeyString - The private key as a string
 * @returns Public key as a string
 */
export function getPublicKeyFromPrivateKey(privateKeyString: string): string {
  const privateKey = parsePrivateKey(privateKeyString);
  return privateKey.publicKey.toStringRaw();
}

/**
 * Result of parsing a private key with optional key type prefix
 */
export interface ParsedKeyWithType {
  keyType: KeyAlgorithmType;
  privateKey: string;
}

/**
 * Parse a private key string that may have an optional key type prefix.
 * Supports formats:
 * - "ed25519:123456..." - ED25519 key with explicit type
 * - "ecdsa:123456..." - ECDSA key with explicit type
 * - "123456..." - Key without prefix (defaults to ecdsa)
 * - Keys with optional 0x prefix: "0x123456..." or "ed25519:0x123456..."
 *
 * Uses Zod schemas from common-schemas.ts for validation.
 *
 * @param privateKeyInput - Private key string, optionally prefixed with key type
 * @returns Parsed key type and private key string
 * @throws Error if the key is empty, invalid format, or if a key type prefix is provided without a key
 */
export function parseKeyWithType(privateKeyInput: string): ParsedKeyWithType {
  const result = PrivateKeyWithTypeSchema.parse(privateKeyInput);
  return {
    keyType: result.keyType,
    privateKey: result.privateKey,
  };
}

/**
 * Result of parsing an id:key pair
 */
export interface ParsedIdKey {
  accountId: string;
  privateKey: string;
  keyType?: KeyAlgorithmType;
}

/**
 * Parse id:key or id:keyType:key format string into accountId, privateKey, and optional keyType
 * @param idKeyPair - String in format "accountId:privateKey" or "accountId:keyType:privateKey"
 * @returns Parsed accountId, privateKey, and optional keyType
 * @throws Error if format is invalid
 */
export function parseIdKeyPair(idKeyPair: string): ParsedIdKey {
  const parts = idKeyPair.split(':');
  if (parts.length < 2 || parts.length > 3) {
    throw new Error(
      'Invalid format. Expected id:key or id:keyType:key (e.g., 0.0.123:key or 0.0.123:ed25519:key)',
    );
  }

  if (parts.length === 2) {
    // Format: accountId:privateKey
    const [accountId, privateKey] = parts;
    return {
      accountId,
      privateKey,
    };
  } else {
    // Format: accountId:keyType:privateKey
    const [accountId, keyTypeStr, privateKey] = parts;
    const keyType = keyTypeStr.toLowerCase();
    if (
      keyType !== KeyAlgorithm.ECDSA.valueOf() &&
      keyType !== KeyAlgorithm.ED25519.valueOf()
    ) {
      throw new Error(
        `Invalid key type: ${keyTypeStr}. Must be '${KeyAlgorithm.ECDSA}' or '${KeyAlgorithm.ED25519}'`,
      );
    }
    return {
      accountId,
      privateKey,
      keyType: keyType as KeyAlgorithmType,
    };
  }
}

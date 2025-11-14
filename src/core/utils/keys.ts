/**
 * Key Utilities
 * Utilities for parsing, validating, and converting cryptographic keys
 */
import { PrivateKey } from '@hashgraph/sdk';

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

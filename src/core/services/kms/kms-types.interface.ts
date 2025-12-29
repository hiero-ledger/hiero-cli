import { z } from 'zod';

import { KeyAlgorithm } from '@/core/shared/constants';

// KEY MANAGERS - SINGLE SOURCE OF TRUTH

/**
 * All available key managers.
 * Add new managers here and they'll be automatically available everywhere.
 * This is the SINGLE SOURCE OF TRUTH for key manager names across the entire project.
 */
export const KEY_MANAGER_VALUES = ['local', 'local_encrypted'] as const;

/**
 * Zod schema for runtime validation
 */
export const keyManagerNameSchema = z
  .enum(KEY_MANAGER_VALUES)
  .describe('Key manager type (local or localEncrypted)');

/**
 * TypeScript type for compile-time checking
 */
export type KeyManagerName = (typeof KEY_MANAGER_VALUES)[number];

/**
 * Helper constants for convenience (auto-generated, type-safe)
 */
export const KEY_MANAGERS = KEY_MANAGER_VALUES.reduce(
  (acc, name) => {
    acc[name] = name;
    return acc;
  },
  {} as Record<KeyManagerName, KeyManagerName>,
);

// KEY ALGORITHMS

/**
 * Zod schema for key algorithm validation at IO boundaries
 */
export const keyAlgorithmSchema = z.enum([
  KeyAlgorithm.ED25519,
  KeyAlgorithm.ECDSA,
]);

// CREDENTIAL RECORD (Metadata)

/**
 * Metadata stored in plaintext for each key.
 * This is the "index" that tells us which KeyManager owns which key.
 */
export interface KmsCredentialRecord {
  keyRefId: string;
  keyManager: KeyManagerName; // Which KeyManager owns this key
  publicKey: string;
  labels?: string[];
  keyAlgorithm: KeyAlgorithm;
  createdAt: string; // ISO timestamp
}

// CREDENTIAL SECRET (Sensitive data)

/**
 * Secret data stored separately (potentially encrypted depending on storage).
 * Each KeyManager has its own SecretStorage implementation.
 */
export interface KmsCredentialSecret {
  keyAlgorithm: KeyAlgorithm;
  privateKey: string; // Raw private key (plain or encrypted depending on storage)
  mnemonic?: string; // For future HD wallet support
  derivationPath?: string; // For future hardware wallet support
  providerHandle?: string; // For future external KMS/HSM
  createdAt: string; // ISO timestamp
}

// EXPLICIT DOMAIN TYPES (ADR-005)

/**
 * Credential using account ID + private key pair
 */
export type KeypairCredential = {
  type: 'keypair';
  accountId: string;
  privateKey: string;
};

/**
 * Credential using account alias from key manager
 */
export type AliasCredential = {
  type: 'alias';
  alias: string;
};

/**
 * Key resolution - explicit keypair or alias reference
 */
export type KeyOrAccountAlias = KeypairCredential | AliasCredential;

/**
 * Parsed "accountId=privateKey" format
 */
export type AccountIdWithPrivateKey = {
  accountId: string;
  privateKey: string;
};

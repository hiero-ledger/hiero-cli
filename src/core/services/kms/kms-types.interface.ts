import type { KeyAlgorithm } from '@/core/shared/constants';

import { z } from 'zod';

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
  updatedAt: string; // ISO timestamp
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

export enum CredentialType {
  ACCOUNT_KEY_PAIR = 'account_key_pair',
  ACCOUNT_ID = 'account_id',
  PRIVATE_KEY = 'private_key',
  PUBLIC_KEY = 'public_key',
  KEY_REFERENCE = 'key_reference',
  ALIAS = 'alias',
}

/**
 * Credential using account ID + private key pair
 */
export type KeypairCredential = {
  type: CredentialType.ACCOUNT_KEY_PAIR;
  accountId: string;
  privateKey: string;
  rawValue: string;
};

/**
 * Credential using account id from key manager
 */
export type AccountIdCredential = {
  type: CredentialType.ACCOUNT_ID;
  accountId: string;
  rawValue: string;
};

/**
 * Credential using public key from key manager
 */
export type PublicKeyCredential = {
  type: CredentialType.PUBLIC_KEY;
  keyType: KeyAlgorithm;
  publicKey: string;
  rawValue: string;
};

/**
 * Credential using private key from key manager
 */
export type PrivateKeyCredential = {
  type: CredentialType.PRIVATE_KEY;
  keyType: KeyAlgorithm;
  privateKey: string;
  rawValue: string;
};

/**
 * Credential using key reference from key manager
 */
export type KeyReferenceCredential = {
  type: CredentialType.KEY_REFERENCE;
  keyReference: string;
  rawValue: string;
};

/**
 * Credential using account alias from key manager
 */
export type AliasCredential = {
  type: CredentialType.ALIAS;
  alias: string;
  rawValue: string;
};

export type Credential =
  | KeypairCredential
  | AccountIdCredential
  | PrivateKeyCredential
  | PublicKeyCredential
  | KeyReferenceCredential
  | AliasCredential;

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

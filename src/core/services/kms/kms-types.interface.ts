import { KeyAlgorithm as KeyAlgorithmEnum } from '../../shared/constants';

/**
 * Credential Type Values
 * Used to ensure consistency between TypeScript types and Zod schemas
 */
export const CREDENTIAL_TYPE_VALUES = [
  'localPrivateKey',
  'mnemonic',
  'hardware',
  'kms',
] as const;

export type CredentialType = (typeof CREDENTIAL_TYPE_VALUES)[number];

export type KeyAlgorithm = KeyAlgorithmEnum;

export interface KmsCredentialRecord {
  keyRefId: string;
  type: CredentialType;
  publicKey: string;
  labels?: string[];
  keyAlgorithm: KeyAlgorithm;
}

export interface KmsCredentialSecret {
  keyAlgorithm: KeyAlgorithm;
  privateKey?: string; // raw, temporary until encryption/KMS
  mnemonic?: string; // optional seed
  derivationPath?: string; // when mnemonic present
  providerHandle?: string; // HMS/KMS/hardware handle
  createdAt: string; // ISO timestamp
}

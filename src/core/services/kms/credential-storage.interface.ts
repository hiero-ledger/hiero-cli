import type { KmsCredentialRecord } from './kms-types.interface';

/**
 * Storage for KmsCredentialRecord (metadata only).
 * This is the "index" that maps keyRefId to KeyManager.
 *
 * Single source of truth for "which KeyManager owns which key".
 */
export interface CredentialStorageInterface {
  /**
   * Get a credential record by keyRefId
   */
  get(keyRefId: string): KmsCredentialRecord | undefined;

  /**
   * Save a credential record
   */
  set(keyRefId: string, record: KmsCredentialRecord): void;

  /**
   * Remove a credential record
   */
  remove(keyRefId: string): void;

  /**
   * List all credential records
   */
  list(): KmsCredentialRecord[];
}

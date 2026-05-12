import type { KmsCredentialSecret } from '@/core/services/kms/kms-types.interface';

/**
 * Abstract storage for secrets (private keys).
 * Each KeyManager has its own SecretStorage implementation.
 *
 * Implementations:
 * - LocalSecretStorage: stores secrets in plaintext
 * - EncryptedSecretStorage: encrypts secrets before storing
 * - LedgerSecretStorage (future): stores only derivation path
 */
export interface SecretStorage {
  /**
   * Write secret to storage.
   * Implementation decides encryption strategy.
   */
  write(keyRefId: string, secret: KmsCredentialSecret): void;

  /**
   * Read secret from storage.
   * Implementation handles decryption if needed.
   */
  read(keyRefId: string): KmsCredentialSecret | null;

  /**
   * Remove secret from storage.
   */
  remove(keyRefId: string): void;
}

import type { Signer } from '../signers/signer.interface';
import type {
  KeyAlgorithmType,
  KmsCredentialSecret,
} from '../kms-types.interface';

/**
 * KeyManager is responsible for:
 * 1. Generating cryptographic keys
 * 2. Storing secrets using manager-specific storage strategy
 * 3. Creating signers that can sign transactions
 *
 * Each implementation (local, encrypted, ledger) handles secrets differently
 * but exposes the same interface.
 */
export interface KeyManager {
  /**
   * Generates a new key pair and automatically saves it to storage.
   * The secret is stored internally using this manager's storage strategy.
   *
   * @param keyRefId - Unique identifier for the key
   * @param algorithm - Key algorithm (ed25519 or ecdsa)
   * @returns Public key only (secret is stored internally)
   */
  generateKey(keyRefId: string, algorithm: KeyAlgorithmType): string;

  /**
   * Writes secret using manager-specific storage strategy.
   * - LocalKeyManager: stores plaintext
   * - EncryptedKeyManager: encrypts before storing
   * - LedgerKeyManager (future): stores only derivation path
   *
   * @param keyRefId - Unique identifier for the key
   * @param secret - Secret data to store
   */
  writeSecret(keyRefId: string, secret: KmsCredentialSecret): void;

  /**
   * Reads secret from storage.
   * - LocalKeyManager: returns plaintext
   * - EncryptedKeyManager: decrypts before returning
   * - LedgerKeyManager (future): returns derivation path
   *
   * @param keyRefId - Unique identifier for the key
   * @returns Secret data or null if not found
   */
  readSecret(keyRefId: string): KmsCredentialSecret | null;

  /**
   * Creates a signer that can sign transactions.
   * Reads secret internally and passes it to signer.
   *
   * The signer abstraction allows different signing strategies:
   * - Local: signs with private key from storage
   * - Encrypted: decrypts key, then signs
   * - Ledger (future): delegates signing to hardware device
   *
   * @param keyRefId - Unique identifier for the key
   * @param publicKey - Public key (for verification)
   * @param algorithm - Key algorithm
   * @returns Signer instance
   */
  createSigner(
    keyRefId: string,
    publicKey: string,
    algorithm: KeyAlgorithmType,
  ): Signer;

  /**
   * Removes secret from storage.
   *
   * Note: This only removes the secret, not the metadata record.
   * KmsService.remove() should call both removeSecret() and credentialStorage.remove()
   *
   * @param keyRefId - Unique identifier for the key
   */
  removeSecret(keyRefId: string): void;
}

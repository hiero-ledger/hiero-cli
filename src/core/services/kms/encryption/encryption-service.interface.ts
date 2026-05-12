/**
 * EncryptionService provides symmetric encryption/decryption capabilities.
 *
 * This abstraction allows different encryption strategies:
 * - EncryptionServiceImpl: AES-256-GCM encryption (current)
 * - Future: HSM-based encryption, cloud KMS, etc.
 */
export interface EncryptionService {
  /**
   * Encrypts plaintext string.
   *
   * @param plaintext - String to encrypt
   * @returns Encrypted string (format determined by implementation)
   */
  encrypt(plaintext: string): string;

  /**
   * Decrypts encrypted string.
   *
   * @param ciphertext - Encrypted string
   * @returns Decrypted plaintext string
   * @throws Error if decryption fails (wrong key, corrupted data, etc.)
   */
  decrypt(ciphertext: string): string;
}

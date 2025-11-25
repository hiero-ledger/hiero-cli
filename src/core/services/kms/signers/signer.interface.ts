/**
 * KmsSignerService provides signing capabilities for transactions.
 *
 * This abstraction allows different signing strategies:
 * - LocalKmsSigner: Signs with private key (plaintext or decrypted)
 * - LedgerKmsSigner (future): Signs using hardware device
 * - HSMKmsSigner (future): Signs using Hardware Security Module
 */
export interface Signer {
  /**
   * Signs a message using the private key.
   *
   * @param bytes - Message bytes to sign
   * @returns Signature bytes
   */
  sign(bytes: Uint8Array): Uint8Array;

  /**
   * Returns the public key associated with this signer.
   *
   * @returns Public key string
   */
  getPublicKey(): string;
}

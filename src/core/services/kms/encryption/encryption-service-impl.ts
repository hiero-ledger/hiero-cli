import type { AlgorithmConfig } from './algorithm-config';
import type { EncryptionService } from './encryption-service.interface';

import * as crypto from 'crypto';

import { FileKeyProvider } from './file-key-provider';

/**
 * Configurable encryption implementation using AES-GCM.
 *
 * Algorithm details:
 * - Supports AES-GCM (Galois/Counter Mode) variants
 * - Key length and init vector length configured via AlgorithmConfig
 * - Random initVector generated per encryption
 * - Authenticated encryption (integrity + confidentiality)
 *
 * Output format: `initVector:authTag:ciphertext` (all hex-encoded)
 *
 * Internally creates and manages FileKeyProvider with matching configuration.
 */
export class EncryptionServiceImpl implements EncryptionService {
  private readonly keyProvider: FileKeyProvider;

  constructor(
    private readonly config: AlgorithmConfig,
    baseDir?: string,
  ) {
    this.keyProvider = new FileKeyProvider(config, baseDir);
  }

  encrypt(plaintext: string): string {
    try {
      const key = this.keyProvider.getOrCreateKey();
      const initVector = crypto.randomBytes(this.config.initVectorLengthBytes);

      const cipher = crypto.createCipheriv(this.config.name, key, initVector);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Authentication tag ensures data integrity and authenticity in GCM mode
      const authTag = (cipher as crypto.CipherGCM).getAuthTag();

      // Format: initVector:authTag:ciphertext (all hex)
      return `${initVector.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new Error(
        `Encryption failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  decrypt(ciphertext: string): string {
    try {
      const parts = ciphertext.split(':');
      if (parts.length !== 3) {
        throw new Error(
          'Invalid ciphertext format (expected initVector:authTag:data)',
        );
      }

      // Authentication tag ensures data integrity and authenticity in GCM mode
      const [initVectorHex, authTagHex, encrypted] = parts;
      const key = this.keyProvider.getOrThrow();

      const decipher = crypto.createDecipheriv(
        this.config.name,
        key,
        Buffer.from(initVectorHex, 'hex'),
      );
      (decipher as crypto.DecipherGCM).setAuthTag(
        Buffer.from(authTagHex, 'hex'),
      );

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

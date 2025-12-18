import type { AlgorithmConfig } from './algorithm-config';
import type { KeyProvider } from './key-provider.interface';

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Auto-generates and stores encryption key in .hedera-cli/.secret-{algorithm}
 *
 * Security model:
 * - Key is auto-generated on first use (user-transparent)
 * - Key length determined by algorithm configuration
 * - Stored in .hedera-cli/.secret-{identifier} (outside of state/ directory)
 * - File permissions set to 0600 (read/write for owner only)
 */
export class FileKeyProvider implements KeyProvider {
  private readonly secretFilePath: string;
  private cachedKey: Buffer | null = null;

  constructor(
    private readonly config: AlgorithmConfig,
    baseDir?: string,
  ) {
    const base = baseDir || path.join(os.homedir(), '.hedera-cli');
    this.secretFilePath = path.join(base, `.secret-${config.identifier}`);
  }

  /**
   * Attempts to get existing key from cache or file.
   *
   * @returns Key if found, null if file doesn't exist
   * @throws Error if key file exists but is invalid
   */
  private tryGetKey(): Buffer | null {
    // Return cached key if available
    if (this.cachedKey) {
      return this.cachedKey;
    }

    // Check if secret file exists
    if (!fs.existsSync(this.secretFilePath)) {
      return null;
    }

    // Read existing key
    const hex = fs.readFileSync(this.secretFilePath, 'utf8').trim();
    const key = Buffer.from(hex, 'hex');

    // Validate key length matches algorithm requirements
    if (key.length !== this.config.keyLengthBytes) {
      throw new Error(
        `Invalid key length for ${this.config.identifier}: ` +
          `expected ${this.config.keyLengthBytes} bytes, got ${key.length} bytes`,
      );
    }

    this.cachedKey = key;
    return this.cachedKey;
  }

  getOrCreateKey(): Buffer {
    const existingKey = this.tryGetKey();
    if (existingKey) {
      return existingKey;
    }

    // Generate new key based on algorithm requirements
    const key = crypto.randomBytes(this.config.keyLengthBytes);
    const hex = key.toString('hex');

    // Ensure .hedera-cli directory exists
    const dir = path.dirname(this.secretFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write key to file with restrictive permissions
    fs.writeFileSync(this.secretFilePath, hex, {
      encoding: 'utf8',
      mode: 0o600, // add read/write permissions for file owner
    });

    this.cachedKey = key;
    return this.cachedKey;
  }

  getOrThrow(): Buffer {
    const existingKey = this.tryGetKey();
    if (existingKey) {
      return existingKey;
    }

    throw new Error(
      `Encryption key not found at ${this.secretFilePath}. ` +
        `Cannot decrypt without existing key.`,
    );
  }
}

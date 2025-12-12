import type {
  KeyAlgorithmType,
  KmsCredentialSecret,
} from '@/core/services/kms/kms-types.interface';
import type { Signer } from '@/core/services/kms/signers/signer.interface';
import type { SecretStorage } from '@/core/services/kms/storage/secret-storage.interface';
import type { KeyManager } from './key-manager.interface';

import { PrivateKey } from '@hashgraph/sdk';

import { PrivateKeySigner } from '@/core/services/kms/signers/private-key-signer';
import { KeyAlgorithm } from '@/core/shared/constants';

/**
 * KeyManager for plaintext local storage.
 * Stores secrets without encryption.
 */
export class LocalKeyManager implements KeyManager {
  private readonly secretStorage: SecretStorage;

  constructor(secretStorage: SecretStorage) {
    this.secretStorage = secretStorage;
  }

  generateKey(keyRefId: string, algorithm: KeyAlgorithmType): string {
    // 1. Generate key pair
    const privateKey =
      algorithm === KeyAlgorithm.ECDSA
        ? PrivateKey.generateECDSA()
        : PrivateKey.generateED25519();

    const publicKey = privateKey.publicKey.toStringRaw();

    // 2. Create and immediately save secret (never expose it)
    const secret: KmsCredentialSecret = {
      keyAlgorithm: algorithm,
      privateKey: privateKey.toStringRaw(),
      createdAt: new Date().toISOString(),
    };

    this.secretStorage.write(keyRefId, secret);

    // 3. Return only public key
    return publicKey;
  }

  writeSecret(keyRefId: string, secret: KmsCredentialSecret): void {
    this.secretStorage.write(keyRefId, secret);
  }

  readSecret(keyRefId: string): KmsCredentialSecret | null {
    return this.secretStorage.read(keyRefId);
  }

  createSigner(
    keyRefId: string,
    publicKey: string,
    algorithm: KeyAlgorithmType,
  ): Signer {
    const secret = this.readSecret(keyRefId);
    if (!secret) {
      throw new Error(`Secret not found for keyRefId: ${keyRefId}`);
    }

    return new PrivateKeySigner(publicKey, secret, algorithm);
  }

  removeSecret(keyRefId: string): void {
    this.secretStorage.remove(keyRefId);
  }
}

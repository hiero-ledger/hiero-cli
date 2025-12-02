import type { KeyManager } from './key-manager.interface';
import type { Signer } from '../signers/signer.interface';
import type {
  KeyAlgorithmType,
  KmsCredentialSecret,
} from '../kms-types.interface';
import { PrivateKeySigner } from '../signers/private-key-signer';
import { PrivateKey } from '@hashgraph/sdk';
import { SecretStorage } from '../storage/secret-storage.interface';
import { KeyAlgorithm } from '../../../shared/constants';

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

import type { StateService } from '../../state/state-service.interface';
import type { KmsCredentialSecret } from '../kms-types.interface';
import type { SecretStorage } from './secret-storage.interface';
import type { EncryptionService } from '../encryption/encryption-service.interface';

/**
 * Encrypted secret storage for EncryptedLocalKeyManager.
 * Encrypts privateKey before storing, decrypts on read.
 */
export class EncryptedSecretStorage implements SecretStorage {
  private readonly namespace = 'kms-secrets-encrypted';

  constructor(
    private readonly state: StateService,
    private readonly encryptionService: EncryptionService,
  ) {}

  write(keyRefId: string, secret: KmsCredentialSecret): void {
    const encrypted: KmsCredentialSecret = {
      ...secret,
      privateKey: this.encryptionService.encrypt(secret.privateKey),
    };
    this.state.set<KmsCredentialSecret>(this.namespace, keyRefId, encrypted);
  }

  read(keyRefId: string): KmsCredentialSecret | null {
    const encrypted = this.state.get<KmsCredentialSecret>(
      this.namespace,
      keyRefId,
    );
    if (!encrypted) return null;

    return {
      ...encrypted,
      privateKey: this.encryptionService.decrypt(encrypted.privateKey),
    };
  }

  remove(keyRefId: string): void {
    this.state.delete(this.namespace, keyRefId);
  }
}

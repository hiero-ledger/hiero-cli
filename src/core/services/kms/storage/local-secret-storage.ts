import type { KmsCredentialSecret } from '@/core/services/kms/kms-types.interface';
import type { StateService } from '@/core/services/state/state-service.interface';

import type { SecretStorage } from './secret-storage.interface';

/**
 * Plaintext secret storage for LocalKeyManager.
 * Stores secrets without encryption.
 */
export class LocalSecretStorage implements SecretStorage {
  private readonly namespace = 'kms-secrets-local';

  constructor(private readonly state: StateService) {}

  write(keyRefId: string, secret: KmsCredentialSecret): void {
    this.state.set<KmsCredentialSecret>(this.namespace, keyRefId, secret);
  }

  read(keyRefId: string): KmsCredentialSecret | null {
    return (
      this.state.get<KmsCredentialSecret>(this.namespace, keyRefId) || null
    );
  }

  remove(keyRefId: string): void {
    this.state.delete(this.namespace, keyRefId);
  }
}

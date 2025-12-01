import type { StateService } from '../state/state-service.interface';
import type { KmsCredentialRecord } from './kms-types.interface';
import type { CredentialStorageInterface } from './credential-storage.interface';

/**
 * Storage for metadata records (KmsCredentialRecord).
 * Refactored from KmsStorageService - removed secret operations.
 *
 * Responsibilities:
 * - Store/retrieve credential metadata (keyRefId, publicKey, keyManager, etc.)
 * - Provide migration for legacy records without keyManager field
 */
export class CredentialStorage implements CredentialStorageInterface {
  private readonly namespace = 'kms-credentials';

  constructor(private readonly state: StateService) {}

  get(keyRefId: string): KmsCredentialRecord | undefined {
    return this.state.get<KmsCredentialRecord>(this.namespace, keyRefId);
  }

  set(keyRefId: string, record: KmsCredentialRecord): void {
    this.state.set<KmsCredentialRecord>(this.namespace, keyRefId, record);
  }

  remove(keyRefId: string): void {
    this.state.delete(this.namespace, keyRefId);
  }

  list(): KmsCredentialRecord[] {
    return this.state.list<KmsCredentialRecord>(this.namespace) || [];
  }
}

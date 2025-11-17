import { KmsSignerService } from './kms-signer-service.interface';
import { KmsStorageServiceInterface } from './kms-storage-service.interface';
import { KeyAlgorithm } from '../../shared/constants';
import { PrivateKey } from '@hashgraph/sdk';
import type { KeyAlgorithm as KeyAlgorithmType } from './kms-types.interface';

export class LocalKmsSignerService implements KmsSignerService {
  private readonly pub: string;
  private readonly keyRefId?: string;
  private readonly storage?: KmsStorageServiceInterface;
  private readonly keyAlgorithm: KeyAlgorithm;

  constructor(
    publicKey: string,
    deps?: {
      keyRefId?: string;
      storage?: KmsStorageServiceInterface;
      keyAlgorithm?: KeyAlgorithmType;
    },
  ) {
    this.pub = publicKey;
    this.keyRefId = deps?.keyRefId;
    this.storage = deps?.storage;
    this.keyAlgorithm = deps?.keyAlgorithm || KeyAlgorithm.ED25519;
  }

  sign(bytes: Uint8Array): Promise<Uint8Array> {
    const secret =
      this.keyRefId && this.storage
        ? this.storage.readSecret(this.keyRefId)
        : null;
    if (!secret || !secret.privateKey) {
      throw new Error('Missing private key for signer');
    }
    const pk =
      this.keyAlgorithm === KeyAlgorithm.ECDSA
        ? PrivateKey.fromStringECDSA(secret.privateKey)
        : PrivateKey.fromStringED25519(secret.privateKey);
    const sig = pk.sign(bytes);
    return Promise.resolve(new Uint8Array(sig));
  }

  getPublicKey(): string {
    return this.pub;
  }
}

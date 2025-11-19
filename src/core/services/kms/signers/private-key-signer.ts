import type { Signer } from './signer.interface';
import type {
  KmsCredentialSecret,
  KeyAlgorithmType,
} from '../kms-types.interface';
import { PrivateKey } from '@hashgraph/sdk';
import { KeyAlgorithm } from '../../../shared/constants';

/**
 * Signer for local keys.
 * No storage dependency - receives decrypted secret directly.
 */
export class PrivateKeySigner implements Signer {
  constructor(
    private readonly publicKey: string,
    private readonly secret: KmsCredentialSecret,
    private readonly algorithm: KeyAlgorithmType,
  ) {}

  sign(bytes: Uint8Array): Uint8Array {
    if (!this.secret.privateKey) {
      throw new Error('Missing private key in secret');
    }

    const privateKey =
      this.algorithm === KeyAlgorithm.ECDSA
        ? PrivateKey.fromStringECDSA(this.secret.privateKey)
        : PrivateKey.fromStringED25519(this.secret.privateKey);

    const signature = privateKey.sign(bytes);
    return new Uint8Array(signature);
  }

  getPublicKey(): string {
    return this.publicKey;
  }
}

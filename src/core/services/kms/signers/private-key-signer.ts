import type { KmsCredentialSecret } from '@/core/services/kms/kms-types.interface';
import type { Signer } from './signer.interface';

import { PrivateKey } from '@hiero-ledger/sdk';
import { SigningKey } from 'ethers';

import { ConfigurationError, ValidationError } from '@/core/errors';
import { KeyAlgorithm } from '@/core/shared/constants';

/**
 * Signer for local keys.
 * No storage dependency - receives decrypted secret directly.
 */
export class PrivateKeySigner implements Signer {
  constructor(
    private readonly publicKey: string,
    private readonly secret: KmsCredentialSecret,
    private readonly algorithm: KeyAlgorithm,
  ) {}

  sign(bytes: Uint8Array): Uint8Array {
    if (!this.secret.privateKey) {
      throw new ConfigurationError('Missing private key in secret');
    }

    const privateKey =
      this.algorithm === KeyAlgorithm.ECDSA
        ? PrivateKey.fromStringECDSA(this.secret.privateKey)
        : PrivateKey.fromStringED25519(this.secret.privateKey);

    const signature = privateKey.sign(bytes);
    return new Uint8Array(signature);
  }

  signHashWithEcdsaKey(hash: string): string {
    if (!this.secret.privateKey) {
      throw new ConfigurationError('Missing private key in secret');
    }
    if (this.algorithm !== KeyAlgorithm.ECDSA) {
      throw new ValidationError(
        'Wallet signing can be only done with ECDSA key',
      );
    }
    const rawPrivateKey = PrivateKey.fromStringECDSA(
      this.secret.privateKey,
    ).toStringRaw();
    const signingKey = new SigningKey(`0x${rawPrivateKey}`);
    return signingKey.sign(hash).serialized;
  }

  getPublicKey(): string {
    return this.publicKey;
  }
}

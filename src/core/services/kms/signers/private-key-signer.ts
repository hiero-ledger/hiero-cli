import type { KmsCredentialSecret } from '@/core/services/kms/kms-types.interface';
import type {
  Eip712Domain,
  Eip712TypedDataField,
} from '@/core/types/shared.types';
import type { Signer } from './signer.interface';

import { PrivateKey } from '@hiero-ledger/sdk';
import { Wallet } from 'ethers';

import { ConfigurationError } from '@/core/errors';
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

  async signWithWallet(
    domain: Eip712Domain,
    types: Record<string, Eip712TypedDataField[]>,
    message: Record<string, unknown>,
  ): Promise<string> {
    if (!this.secret.privateKey) {
      throw new ConfigurationError('Missing private key in secret');
    }
    const rawPrivateKey = PrivateKey.fromStringECDSA(
      this.secret.privateKey,
    ).toStringRaw();
    const wallet = new Wallet(`0x${rawPrivateKey}`);
    // ethers v6 adds EIP712Domain automatically — strip it if present to avoid conflict
    const { EIP712Domain: _ignored, ...filteredTypes } = types;
    return await wallet.signTypedData(domain, filteredTypes, message);
  }

  getPublicKey(): string {
    return this.publicKey;
  }
}

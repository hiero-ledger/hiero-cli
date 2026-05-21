import type { IdentityResolutionService } from '@/core/services/identity-resolution/identity-resolution-service.interface';
import type { KeyResolverService } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { Eip712VerifyOutput } from '@/plugins/eip712/commands/verify/output';
import type { ExpectedSignerType } from '@/plugins/eip712/commands/verify/types';
import type {
  Eip712VerificationService,
  VerifyEcdsaParams,
  VerifyEd25519Params,
} from './eip712-verification.service.interface';

import { PublicKey } from '@hiero-ledger/sdk';
import { recoverAddress } from 'ethers';

import { EntityReferenceType } from '@/core';
import { ValidationError } from '@/core/errors';
import { KeyAlgorithm } from '@/core/shared/constants';

export class Eip712VerificationServiceImpl implements Eip712VerificationService {
  constructor(
    private readonly identityResolution: IdentityResolutionService,
    private readonly keyResolver: KeyResolverService,
    private readonly kms: KmsService,
  ) {}

  async verifyEcdsa(params: VerifyEcdsaParams): Promise<Eip712VerifyOutput> {
    const recoveredSigner = recoverAddress(params.hash, params.signature);
    const output: Eip712VerifyOutput = { recoveredSigner };

    if (params.expectedSigner) {
      const expectedSignerEvmAddress = await this.resolveExpectedSigner(
        params.expectedSigner,
        params.network,
      );
      output.match =
        recoveredSigner.toLowerCase().trim() ===
        expectedSignerEvmAddress.toLowerCase().trim();
    }

    return output;
  }

  async verifyEd25519(
    params: VerifyEd25519Params,
  ): Promise<Eip712VerifyOutput> {
    const resolved = await this.keyResolver.getPublicKey(
      params.credential,
      params.keyManager,
      true,
      ['eip712:verify'],
    );

    const kmsRecord = this.kms.get(resolved.keyRefId);
    if (!kmsRecord) {
      throw new ValidationError(
        `Key reference not found: ${resolved.keyRefId}`,
      );
    }
    if (kmsRecord.keyAlgorithm !== KeyAlgorithm.ED25519) {
      throw new ValidationError(
        `ED25519 verification requires an ED25519 key; key ${resolved.keyRefId} uses ${kmsRecord.keyAlgorithm}`,
      );
    }

    const hashBytes = new Uint8Array(Buffer.from(params.hash.slice(2), 'hex'));
    const signatureBytes = new Uint8Array(
      Buffer.from(params.signature.slice(2), 'hex'),
    );
    const publicKey = PublicKey.fromStringED25519(kmsRecord.publicKey);
    const verified = publicKey.verify(hashBytes, signatureBytes);

    return {
      signerPublicKey: kmsRecord.publicKey,
      hash: params.hash,
      verified,
    };
  }

  private async resolveExpectedSigner(
    expectedSigner: ExpectedSignerType,
    network: SupportedNetwork,
  ): Promise<string> {
    if (expectedSigner.type === EntityReferenceType.EVM_ADDRESS) {
      return expectedSigner.value;
    }
    const expectedSignerAccount = await this.identityResolution.resolveAccount({
      accountReference: expectedSigner.value,
      type: expectedSigner.type,
      network,
    });
    if (!expectedSignerAccount.evmAddress) {
      throw new ValidationError(
        `Could not resolve evm address for expected signer parameter ${expectedSigner.value}`,
      );
    }
    return expectedSignerAccount.evmAddress;
  }
}

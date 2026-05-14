import type {
  CommandHandlerArgs,
  CommandResult,
  CoreApi,
  IdentityResolutionService,
  SupportedNetwork,
} from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type {
  Credential,
  KeyManager,
} from '@/core/services/kms/kms-types.interface';
import type { Eip712VerifyOutput } from './output';
import type { ExpectedSignerType } from './types';

import { PublicKey } from '@hiero-ledger/sdk';
import { recoverAddress } from 'ethers';

import { EntityReferenceType } from '@/core';
import { ValidationError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { KeyAlgorithm } from '@/core/shared/constants';
import { isEcdsaSignature } from '@/plugins/eip712/util/detect-signature-algorithm';
import { resolveEip712DataContents } from '@/plugins/eip712/util/resolve-eip712-data-contents';
import { resolveHash } from '@/plugins/eip712/util/resolve-hash';

import { Eip712VerifyInputSchema } from './input';

export class Eip712VerifyCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = Eip712VerifyInputSchema.parse(args.args);

    const { domain, types, message } = resolveEip712DataContents(validArgs);
    const hash = resolveHash(validArgs.hash, domain, types, message);
    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    if (isEcdsaSignature(validArgs.signature)) {
      return this.verifyEcdsa(
        validArgs.signature,
        hash,
        validArgs.expectedSigner,
        api.identityResolution,
        api.network.getCurrentNetwork(),
      );
    }

    return this.verifyEd25519(
      keyManager,
      validArgs.key,
      validArgs.signature,
      hash,
      api,
    );
  }

  private async verifyEcdsa(
    signature: string,
    hash: string,
    expectedSigner: ExpectedSignerType | undefined,
    identityResolution: IdentityResolutionService,
    network: SupportedNetwork,
  ): Promise<CommandResult> {
    const recoveredSigner = recoverAddress(hash, signature);
    const output: Eip712VerifyOutput = { recoveredSigner };

    if (expectedSigner) {
      const expectedSignerEvmAddress = await this.resolveExpectedSigner(
        expectedSigner,
        identityResolution,
        network,
      );
      output.match =
        recoveredSigner.toLowerCase().trim() ===
        expectedSignerEvmAddress.toLowerCase().trim();
    }

    return { result: output };
  }

  private async verifyEd25519(
    keyManager: KeyManager,
    credential: Credential | undefined,
    signature: string,
    hash: string,
    api: CoreApi,
  ): Promise<CommandResult> {
    const resolved = await api.keyResolver.getPublicKey(
      credential,
      keyManager,
      true,
      ['eip712:verify'],
    );

    const kmsRecord = api.kms.get(resolved.keyRefId);
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

    const hashBytes = new Uint8Array(Buffer.from(hash.slice(2), 'hex'));
    const signatureBytes = new Uint8Array(
      Buffer.from(signature.slice(2), 'hex'),
    );
    const publicKey = PublicKey.fromStringED25519(kmsRecord.publicKey);
    const verified = publicKey.verify(hashBytes, signatureBytes);

    const output: Eip712VerifyOutput = {
      signerPublicKey: kmsRecord.publicKey,
      hash,
      verified,
    };

    return { result: output };
  }

  private async resolveExpectedSigner(
    expectedSigner: ExpectedSignerType,
    identityResolutionService: IdentityResolutionService,
    network: SupportedNetwork,
  ): Promise<string> {
    if (expectedSigner.type === EntityReferenceType.EVM_ADDRESS) {
      return expectedSigner.value;
    }
    const expectedSignerAccount =
      await identityResolutionService.resolveAccount({
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

export async function eip712Verify(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new Eip712VerifyCommand().execute(args);
}

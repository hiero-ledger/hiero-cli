import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { Signer } from '@/core/services/kms/signers/signer.interface';
import type { Eip712SignOutput } from './output';

import { computeAddress } from 'ethers';

import { ValidationError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { KeyAlgorithm } from '@/core/shared/constants';
import { parseEcdsaSignature } from '@/plugins/eip712/util/parse-ecdsa-signature';
import { resolveEip712DataContents } from '@/plugins/eip712/util/resolve-eip712-data-contents';
import { resolveHash } from '@/plugins/eip712/util/resolve-hash';

import { Eip712SignInputSchema } from './input';

export class Eip712SignCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = Eip712SignInputSchema.parse(args.args);

    const { domain, types, message } = resolveEip712DataContents(validArgs);
    const hash = resolveHash(validArgs.hash, domain, types, message);

    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const resolved = await api.keyResolver.resolveSigningKey(
      validArgs.key,
      keyManager,
      true,
      ['eip712:sign'],
    );

    const kmsRecord = api.kms.get(resolved.keyRefId);
    if (!kmsRecord) {
      throw new ValidationError(
        `Key reference not found: ${resolved.keyRefId}`,
      );
    }
    const signer = api.kms.getSignerHandle(kmsRecord.keyRefId);

    return kmsRecord.keyAlgorithm === KeyAlgorithm.ECDSA
      ? this.signAndPrepareOutputForEcdsa(signer, hash, kmsRecord.publicKey)
      : this.signAndPrepareOutputForEd25519(signer, hash, kmsRecord.publicKey);
  }

  private signAndPrepareOutputForEcdsa(
    signer: Signer,
    hash: string,
    publicKey: string,
  ): CommandResult {
    const signature = signer.signHashWithEcdsaKey(hash);
    const signerEvm = computeAddress(`0x${publicKey}`);
    const { r, s, v } = parseEcdsaSignature(signature);

    const output: Eip712SignOutput = { signerEvm, signature, hash, r, s, v };
    return { result: output };
  }

  private signAndPrepareOutputForEd25519(
    signer: Signer,
    hash: string,
    publicKey: string,
  ): CommandResult {
    const digestBytes = Buffer.from(hash.slice(2), 'hex');
    const signatureBytes = signer.sign(digestBytes);
    const signature = `0x${Buffer.from(signatureBytes).toString('hex')}`;

    const output: Eip712SignOutput = {
      signerPublicKey: `0x${publicKey}`,
      hash,
      signature,
    };
    return { result: output };
  }
}

export async function eip712Sign(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new Eip712SignCommand().execute(args);
}

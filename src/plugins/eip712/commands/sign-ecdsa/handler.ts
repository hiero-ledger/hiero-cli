import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { Eip712SignEcdsaOutput } from './output';

import { computeAddress } from 'ethers';

import { ValidationError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { KeyAlgorithm } from '@/core/shared/constants';
import { resolveHash } from '@/plugins/eip712/util/resolve-hash';

import { Eip712SignEcdsaInputSchema } from './input';

export class Eip712SignEcdsaCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = Eip712SignEcdsaInputSchema.parse(args.args);

    const hash = resolveHash(
      validArgs.hash,
      validArgs.domain?.value,
      validArgs.types?.value,
      validArgs.message?.value,
    );

    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const resolved = await api.keyResolver.resolveSigningKey(
      validArgs.key,
      keyManager,
      true,
      ['eip712:signer'],
    );

    const kmsRecord = api.kms.get(resolved.keyRefId);
    if (!kmsRecord) {
      throw new ValidationError(
        `Key reference not found: ${resolved.keyRefId}`,
      );
    }
    if (kmsRecord.keyAlgorithm !== KeyAlgorithm.ECDSA) {
      throw new ValidationError(
        `EIP-712 signing requires an ECDSA key; key ${resolved.keyRefId} uses ${kmsRecord.keyAlgorithm}`,
      );
    }
    const signer = api.kms.getSignerHandle(kmsRecord.keyRefId);
    const signature = signer.signHashWithEcdsaKey(hash);

    const signerEvm = computeAddress(`0x${kmsRecord.publicKey}`);
    const r = `0x${signature.slice(2, 66)}`;
    const s = `0x${signature.slice(66, 130)}`;
    const v = parseInt(signature.slice(130, 132), 16) as 27 | 28;

    const output: Eip712SignEcdsaOutput = {
      signerEvm,
      signature,
      hash,
      r,
      s,
      v,
    };

    return { result: output };
  }
}

export async function eip712SignEcdsa(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new Eip712SignEcdsaCommand().execute(args);
}

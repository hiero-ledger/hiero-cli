import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { Ed25519SignOutput } from './output';

import { ValidationError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { KeyAlgorithm } from '@/core/shared/constants';
import { resolveHash } from '@/plugins/eip712/util/resolve-hash';

import { Ed25519SignInputSchema } from './input';

export class Ed25519SignCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = Ed25519SignInputSchema.parse(args.args);

    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const resolved = await api.keyResolver.resolveSigningKey(
      validArgs.key,
      keyManager,
      true,
      ['eip712:ed25519:signer'],
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

    const hash = resolveHash(
      validArgs.hash,
      validArgs.domain?.value,
      validArgs.types?.value,
      validArgs.message?.value,
    );
    const digestBytes = Buffer.from(hash.slice(2), 'hex');

    const signer = api.kms.getSignerHandle(kmsRecord.keyRefId);
    const signatureBytes = signer.sign(digestBytes);
    const signature = `0x${Buffer.from(signatureBytes).toString('hex')}`;

    const output: Ed25519SignOutput = {
      signerPublicKey: `0x${kmsRecord.publicKey}`,
      hash,
      signature,
    };

    return { result: output };
  }
}

export async function ed25519Sign(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new Ed25519SignCommand().execute(args);
}

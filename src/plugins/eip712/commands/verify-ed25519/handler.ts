import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { Ed25519VerifyOutput } from './output';

import { PublicKey } from '@hiero-ledger/sdk';

import { ValidationError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { KeyAlgorithm } from '@/core/shared/constants';
import { resolveEip712DataContents } from '@/plugins/eip712/util/resolve-eip712-data-contents';
import { resolveHash } from '@/plugins/eip712/util/resolve-hash';

import { Ed25519VerifyInputSchema } from './input';

export class Ed25519VerifyCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = Ed25519VerifyInputSchema.parse(args.args);

    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const resolved = await api.keyResolver.getPublicKey(
      validArgs.key,
      keyManager,
      true,
      ['eip712:ed25519-verifier'],
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

    const { domain, types, message } = resolveEip712DataContents(validArgs);

    const hash = resolveHash(validArgs.hash, domain, types, message);
    const hashBytes = new Uint8Array(Buffer.from(hash.slice(2), 'hex'));

    const signature = validArgs.signature.slice(2);
    const signatureBytes = new Uint8Array(Buffer.from(signature, 'hex'));

    const publicKey = PublicKey.fromStringED25519(kmsRecord.publicKey);
    const verified = publicKey.verify(hashBytes, signatureBytes);

    const output: Ed25519VerifyOutput = {
      signerPublicKey: kmsRecord.publicKey,
      hash,
      verified,
    };

    return { result: output };
  }
}

export async function ed25519Verify(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new Ed25519VerifyCommand().execute(args);
}

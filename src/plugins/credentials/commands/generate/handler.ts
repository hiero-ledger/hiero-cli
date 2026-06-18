import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { CredentialsGenerateOutput } from '@/plugins/credentials/commands/generate/output';

import { ConfigOptionKey } from '@/core';
import { KeyAlgorithm } from '@/core/shared/constants';
import { AliasType } from '@/core/types/shared.types';

import { CredentialsGenerateInputSchema } from './input';

export class CredentialsGenerateCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const {
      alias,
      keyType,
      keyManager: keyManagerArg,
    } = CredentialsGenerateInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();

    // Validate alias availability before creating the key so a taken alias
    // never leaves an orphan key behind.
    api.alias.availableOrThrow(alias, network);

    const keyManager =
      keyManagerArg ??
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);
    const keyAlgorithm = keyType ?? KeyAlgorithm.ECDSA;

    api.logger.info('🔑 Generating new private key...');

    const { keyRefId, publicKey } = api.kms.createLocalPrivateKey(
      keyAlgorithm,
      keyManager,
      ['credentials:generate'],
    );

    if (alias) {
      api.alias.register({
        alias,
        type: AliasType.Key,
        network,
        publicKey,
        keyRefId,
        createdAt: new Date().toISOString(),
      });
    }

    const output: CredentialsGenerateOutput = {
      keyRefId,
      publicKey,
      keyAlgorithm,
      keyManager,
      alias,
      network,
    };

    return { result: output };
  }
}

export async function credentialsGenerate(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new CredentialsGenerateCommand().execute(args);
}

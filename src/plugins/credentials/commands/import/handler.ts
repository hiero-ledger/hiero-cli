import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { CredentialsImportOutput } from '@/plugins/credentials/commands/import/output';

import { ConfigOptionKey } from '@/core';
import { AliasType } from '@/core/types/shared.types';
import { CredentialsImportInputSchema } from '@/plugins/credentials/commands/import/input';

export class CredentialsImportCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const {
      key,
      alias,
      keyManager: keyManagerArg,
    } = CredentialsImportInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();

    // Validate alias availability before importing the key so a taken alias
    // never leaves an orphan key behind.
    api.alias.availableOrThrow(alias, network);

    const keyManager =
      keyManagerArg ??
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);
    const resolvedKey = await api.keyResolver.resolveSigningKey(
      key,
      keyManager,
      false,
    );
    const { keyRefId, publicKey } = resolvedKey;

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

    const output: CredentialsImportOutput = {
      keyRefId,
      publicKey,
      keyManager,
      alias,
      network,
    };

    return { result: output };
  }
}

export async function credentialsImport(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new CredentialsImportCommand().execute(args);
}

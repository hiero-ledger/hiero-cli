import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { CredentialsListOutput } from './output';

import { AliasType } from '@/core/types/shared.types';

export class CredentialsListCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    api.logger.info('🔐 Retrieving stored credentials...');

    const credentials = api.kms.list();

    const network = api.network.getCurrentNetwork();
    const keyAliases = api.alias.list({ network, type: AliasType.Key }) ?? [];
    const aliasByKeyRefId = new Map(
      keyAliases
        .filter((record) => record.keyRefId)
        .map((record) => [record.keyRefId, record.alias]),
    );

    const outputData: CredentialsListOutput = {
      credentials: credentials.map((cred) => ({
        keyRefId: cred.keyRefId,
        keyManager: cred.keyManager,
        publicKey: cred.publicKey,
        keyAlgorithm: cred.keyAlgorithm,
        alias: aliasByKeyRefId.get(cred.keyRefId),
        labels: cred.labels || [],
      })),
      totalCount: credentials.length,
    };

    return { result: outputData };
  }
}

export async function credentialsList(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new CredentialsListCommand().execute(args);
}

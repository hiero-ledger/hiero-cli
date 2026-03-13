import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ListCredentialsOutput } from './output';

export class ListCredentialsCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { logger, api } = args;

    logger.info('🔐 Retrieving stored credentials...');

    const credentials = api.kms.list();

    const outputData: ListCredentialsOutput = {
      credentials: credentials.map((cred) => ({
        keyRefId: cred.keyRefId,
        keyManager: cred.keyManager,
        publicKey: cred.publicKey,
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
  return new ListCredentialsCommand().execute(args);
}

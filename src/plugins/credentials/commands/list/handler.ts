import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { CommandResult } from '@/core/plugins/plugin.types';
import type { ListCredentialsOutput } from './output';

export async function listCredentials(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
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

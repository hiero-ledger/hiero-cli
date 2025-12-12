/**
 * List Credentials Command Handler
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { CommandExecutionResult } from '@/core/plugins/plugin.types';
import type { ListCredentialsOutput } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

export async function listCredentials(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger, api } = args;

  logger.info('🔐 Retrieving stored credentials...');

  try {
    const credentials = api.kms.list();

    // Map the credentials to match our output schema
    const mappedCredentials = credentials.map((cred) => ({
      keyRefId: cred.keyRefId,
      keyManager: cred.keyManager,
      publicKey: cred.publicKey,
      labels: cred.labels || [],
    }));

    // Prepare output data
    const outputData: ListCredentialsOutput = {
      credentials: mappedCredentials,
      totalCount: credentials.length,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to list credentials', error),
    };
  }
}

/**
 * Remove Credentials Command Handler
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { RemoveCredentialsOutput } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

import { RemoveCredentialsInputSchema } from './input';

export async function removeCredentials(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger, api } = args;

  // Parse and validate args
  const { id } = RemoveCredentialsInputSchema.parse(args.args);

  logger.info(`🗑️  Removing credentials for id: ${id}`);

  try {
    const publicKey = api.kms.getPublicKey(id);
    if (!publicKey) {
      const outputData: RemoveCredentialsOutput = {
        keyRefId: id,
        removed: false,
      };

      return {
        status: Status.Failure,
        errorMessage: `Credential with key reference ID '${id}' does not exist`,
        outputJson: JSON.stringify(outputData),
      };
    }

    // Remove the credentials
    api.kms.remove(id);

    // Prepare output data
    const outputData: RemoveCredentialsOutput = {
      keyRefId: id,
      removed: true,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    // Even if removal fails, we still want to return a structured response
    const outputData: RemoveCredentialsOutput = {
      keyRefId: id,
      removed: false,
    };

    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to remove credentials', error),
      outputJson: JSON.stringify(outputData),
    };
  }
}

/**
 * Remove Credentials Command Handler
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../core/utils/errors';
import { RemoveCredentialsOutput } from './output';
import { RemoveCredentialsInputSchema } from './input';

export async function removeCredentials(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger, api } = args;

  // Parse and validate args
  const { id } = RemoveCredentialsInputSchema.parse(args.args);

  logger.info(`🗑️  Removing credentials for id: ${id}`);

  try {
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

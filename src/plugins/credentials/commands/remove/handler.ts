/**
 * Remove Credentials Command Handler
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../utils/errors';
import { RemoveCredentialsOutput } from './output';

export async function removeCredentials(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger, api } = args;
  const { keyRefId } = args.args as { keyRefId: string };

  logger.log(`🗑️  Removing credentials for keyRefId: ${keyRefId}`);

  try {
    // Remove the credentials
    api.kms.remove(keyRefId);

    // Prepare output data
    const outputData: RemoveCredentialsOutput = {
      keyRefId,
      removed: true,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    // Even if removal fails, we still want to return a structured response
    const outputData: RemoveCredentialsOutput = {
      keyRefId,
      removed: false,
    };

    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to remove credentials', error),
      outputJson: JSON.stringify(outputData),
    };
  }
}

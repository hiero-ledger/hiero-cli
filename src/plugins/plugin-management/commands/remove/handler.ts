/**
 * Remove Plugin Command Handler
 * Handles removing a plugin from the system
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../utils/errors';
import { RemovePluginOutput } from './output';

export async function removePlugin(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger } = args;
  const { name } = args.args as { name: string };

  logger.log('➖ Removing plugin...');

  try {
    // Note: In a real implementation, this would use the plugin manager
    // For now, we'll just simulate the action
    const outputData: RemovePluginOutput = {
      name,
      removed: true,
      message: `Plugin ${name} removed successfully`,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to remove plugin', error),
    };
  }
}

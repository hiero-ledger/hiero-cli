/**
 * Add Plugin Command Handler
 * Handles adding a plugin to the system
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../utils/errors';
import { AddPluginOutput } from './output';

export async function addPlugin(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger } = args;
  const { path } = args.args as { path: string };

  logger.log('➕ Adding plugin...');

  try {
    // Note: In a real implementation, this would use the plugin manager
    // For now, we'll just simulate the action
    const pluginName = path.split('/').pop()?.replace('.js', '') || 'unknown';

    const outputData: AddPluginOutput = {
      name: pluginName,
      path,
      added: true,
      message: `Plugin ${pluginName} added successfully`,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to add plugin', error),
    };
  }
}

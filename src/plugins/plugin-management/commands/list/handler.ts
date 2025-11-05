/**
 * List Plugins Command Handler
 * Handles listing all available plugins
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../utils/errors';
import { ListPluginsOutput } from './output';

export async function getPluginList(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger } = args;

  logger.log('📋 Getting plugin list...');

  try {
    // Note: In a real implementation, this would use the plugin manager
    // For now, we'll return mock data
    const outputData: ListPluginsOutput = {
      plugins: [
        {
          name: 'account',
          displayName: 'Hedera Account Management',
          version: '1.0.0',
          status: 'loaded',
        },
        {
          name: 'plugin-management',
          displayName: 'Plugin Management',
          version: '1.0.0',
          status: 'loaded',
        },
      ],
      count: 2,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to list plugins', error),
    };
  }
}

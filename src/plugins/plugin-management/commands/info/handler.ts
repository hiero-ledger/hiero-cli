/**
 * Plugin Info Command Handler
 * Handles getting detailed information about a specific plugin
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../core/utils/errors';
import { PluginInfoOutput } from './output';

export async function getPluginInfo(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { logger } = args;
  const { name } = args.args as { name: string };

  logger.log(`ℹ️  Getting plugin information: ${name}`);

  try {
    // Note: In a real implementation, this would use the plugin manager
    // For now, we'll return mock data based on the plugin name
    let outputData: PluginInfoOutput;

    if (name === 'account') {
      outputData = {
        plugin: {
          name: 'account',
          version: '1.0.0',
          displayName: 'Hedera Account Management',
          description: 'Hedera Account Management',
          status: 'loaded',
          commands: [
            'create',
            'list',
            'balance',
            'import',
            'clear',
            'delete',
            'view',
          ],
          capabilities: [
            'network:read',
            'network:write',
            'state:namespace:accounts',
            'tx-execution:use',
          ],
        },
        found: true,
        message: 'Plugin information retrieved successfully',
      };
    } else if (name === 'plugin-management') {
      outputData = {
        plugin: {
          name: 'plugin-management',
          version: '1.0.0',
          displayName: 'Plugin Management',
          description: 'Plugin Management',
          status: 'loaded',
          commands: ['add', 'remove', 'list', 'info'],
          capabilities: ['plugin:manage', 'plugin:list', 'plugin:info'],
        },
        found: true,
        message: 'Plugin information retrieved successfully',
      };
    } else {
      outputData = {
        found: false,
        message: `Plugin '${name}' not found`,
      };
    }

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to get plugin information', error),
    };
  }
}

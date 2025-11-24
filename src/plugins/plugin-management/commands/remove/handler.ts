/**
 * Remove Plugin Command Handler
 * Removes a plugin entry from the plugin-management state.
 * Follows ADR-003 contract: returns CommandExecutionResult.
 */
import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../core/utils/errors';
import { RemovePluginOutput } from './output';
import { PluginManagementRemoveStatus } from '../../../../core/services/plugin-management/plugin-management-service.interface';

export async function removePlugin(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;
  const { name } = args.args as { name: string };

  logger.info('🗑️ Removing plugin from state...');

  try {
    const result = api.pluginManagement.removePlugin(name);

    if (result.status === PluginManagementRemoveStatus.Protected) {
      const protectedResult: RemovePluginOutput = {
        name,
        removed: false,
        message:
          'Plugin plugin-management is a core plugin and cannot be removed from state via CLI.',
      };

      return {
        status: Status.Success,
        outputJson: JSON.stringify(protectedResult),
      };
    }

    if (result.status === PluginManagementRemoveStatus.NotFound) {
      const notFound: RemovePluginOutput = {
        name,
        removed: false,
        message: `Plugin ${name} is not registered in plugin-management state`,
      };

      return {
        status: Status.Success,
        outputJson: JSON.stringify(notFound),
      };
    }

    const outputData: RemovePluginOutput = {
      name,
      removed: true,
      message: `Plugin ${name} removed from plugin-management state`,
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

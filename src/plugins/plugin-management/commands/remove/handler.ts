/**
 * Remove Plugin Command Handler
 * Removes a plugin entry from the plugin-management state.
 * Follows ADR-003 contract: returns CommandExecutionResult.
 */
import { CommandHandlerArgs } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../core/utils/errors';
import { RemovePluginOutput } from './output';
import { PluginManagementRemoveStatus } from '../../../../core/services/plugin-management/plugin-management-service.interface';
import { RemovePluginInputSchema } from './input';

export async function removePlugin(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Parse and validate args
  const validArgs = RemovePluginInputSchema.parse(args.args);

  const name = validArgs.name;

  logger.info('🗑️ Removing plugin from state...');

  try {
    const result = api.pluginManagement.removePlugin(name);

    if (result.status === PluginManagementRemoveStatus.NotFound) {
      return {
        status: Status.Failure,
        errorMessage: `Plugin ${name} not found in plugin-management state`,
      };
    }

    if (result.status === PluginManagementRemoveStatus.Protected) {
      return {
        status: Status.Failure,
        errorMessage: `Plugin ${name} is a core plugin and cannot be removed from state via CLI`,
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

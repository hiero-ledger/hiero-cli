/**
 * Disable Plugin Command Handler
 * Marks an existing plugin as disabled in the plugin-management state.
 * Follows ADR-003 contract: returns CommandExecutionResult.
 */
import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../core/utils/errors';
import { RemovePluginOutput } from '../../schema';
import { PluginManagementDisableStatus } from '../../../../core/services/plugin-management/plugin-management-service.interface';

export async function disablePlugin(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;
  const { name } = args.args as { name: string };

  logger.info('➖ Disabling plugin...');

  try {
    const result = api.pluginManagement.disablePlugin(name);

    if (result.status === PluginManagementDisableStatus.NotFound) {
      const notFound: RemovePluginOutput = {
        name,
        removed: false,
        message: `Plugin ${name} is not registered in state`,
      };

      return {
        status: Status.Success,
        outputJson: JSON.stringify(notFound),
      };
    }

    if (result.status === PluginManagementDisableStatus.Protected) {
      const protectedResult: RemovePluginOutput = {
        name,
        removed: false,
        message:
          'Plugin plugin-management is protected and cannot be disabled.',
      };

      return {
        status: Status.Success,
        outputJson: JSON.stringify(protectedResult),
      };
    }

    if (result.status === PluginManagementDisableStatus.AlreadyDisabled) {
      const alreadyDisabled: RemovePluginOutput = {
        name,
        removed: false,
        message: `Plugin ${name} is already disabled`,
      };

      return {
        status: Status.Success,
        outputJson: JSON.stringify(alreadyDisabled),
      };
    }

    const outputData: RemovePluginOutput = {
      name,
      removed: true,
      message: `Plugin ${name} disabled successfully`,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to disable plugin', error),
    };
  }
}

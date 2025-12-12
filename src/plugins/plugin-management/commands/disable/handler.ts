/**
 * Disable Plugin Command Handler
 * Marks an existing plugin as disabled in the plugin-management state.
 * Follows ADR-003 contract: returns CommandExecutionResult.
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { RemovePluginOutput } from '@/plugins/plugin-management/schema';

import { PluginManagementDisableStatus } from '@/core/services/plugin-management/plugin-management-service.interface';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { ERROR_MESSAGES } from '@/plugins/plugin-management/error-messages';

import { DisablePluginInputSchema } from './input';

export async function disablePlugin(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Parse and validate args
  const validArgs = DisablePluginInputSchema.parse(args.args);

  const name = validArgs.name;

  logger.info('➖ Disabling plugin...');

  try {
    const result = api.pluginManagement.disablePlugin(name);

    if (result.status === PluginManagementDisableStatus.NotFound) {
      return {
        status: Status.Failure,
        errorMessage: ERROR_MESSAGES.pluginNotFound(name),
      };
    }

    if (result.status === PluginManagementDisableStatus.Protected) {
      return {
        status: Status.Failure,
        errorMessage: ERROR_MESSAGES.pluginProtectedCannotDisable(name),
      };
    }

    if (result.status === PluginManagementDisableStatus.AlreadyDisabled) {
      return {
        status: Status.Failure,
        errorMessage: ERROR_MESSAGES.pluginAlreadyDisabled(name),
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

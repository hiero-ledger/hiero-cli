/**
 * Disable Plugin Command Handler
 * Marks an existing plugin as disabled in the plugin-management state.
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { DisablePluginOutput } from './output';

import { NotFoundError, StateError } from '@/core/errors';
import { PluginManagementDisableStatus } from '@/core/services/plugin-management/plugin-management-service.interface';
import { ERROR_MESSAGES } from '@/plugins/plugin-management/error-messages';

import { DisablePluginInputSchema } from './input';

export async function disablePlugin(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const validArgs = DisablePluginInputSchema.parse(args.args);
  const name = validArgs.name;

  logger.info('➖ Disabling plugin...');

  const result = api.pluginManagement.disablePlugin(name);

  if (result.status === PluginManagementDisableStatus.NotFound) {
    throw new NotFoundError(ERROR_MESSAGES.pluginNotFound(name), {
      context: { pluginName: name },
    });
  }

  if (result.status === PluginManagementDisableStatus.Protected) {
    throw new StateError(ERROR_MESSAGES.pluginProtectedCannotDisable(name), {
      context: { pluginName: name },
    });
  }

  if (result.status === PluginManagementDisableStatus.AlreadyDisabled) {
    throw new StateError(ERROR_MESSAGES.pluginAlreadyDisabled(name), {
      context: { pluginName: name },
    });
  }

  const outputData: DisablePluginOutput = {
    name,
    removed: true,
    message: `Plugin ${name} disabled successfully`,
  };

  return { result: outputData };
}

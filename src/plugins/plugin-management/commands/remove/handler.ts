/**
 * Remove Plugin Command Handler
 * Removes a plugin entry from the plugin-management state.
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { RemovePluginOutput } from './output';

import { NotFoundError, StateError } from '@/core/errors';
import { PluginManagementRemoveStatus } from '@/core/services/plugin-management/plugin-management-service.interface';
import { ERROR_MESSAGES } from '@/plugins/plugin-management/error-messages';

import { RemovePluginInputSchema } from './input';

export class RemovePluginCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const validArgs = RemovePluginInputSchema.parse(args.args);
    const name = validArgs.name;

    logger.info('🗑️ Removing plugin from state...');

    const result = api.pluginManagement.removePlugin(name);

    if (result.status === PluginManagementRemoveStatus.NotFound) {
      throw new NotFoundError(ERROR_MESSAGES.pluginNotFound(name), {
        context: { pluginName: name },
      });
    }

    if (result.status === PluginManagementRemoveStatus.Protected) {
      throw new StateError(ERROR_MESSAGES.pluginProtectedCannotRemove(name), {
        context: { pluginName: name },
      });
    }

    const outputData: RemovePluginOutput = {
      name,
      removed: true,
      message: `Plugin ${name} removed from plugin-management state`,
    };

    return { result: outputData };
  }
}

export async function removePlugin(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new RemovePluginCommand().execute(args);
}

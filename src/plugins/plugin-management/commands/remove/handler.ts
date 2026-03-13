/**
 * Remove Plugin Command Handler
 * Removes a plugin entry from the plugin-management state.
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { PluginManagementRemoveOutput } from './output';

import { NotFoundError, StateError } from '@/core/errors';
import { PluginManagementRemoveStatus } from '@/core/services/plugin-management/plugin-management-service.interface';
import { ERROR_MESSAGES } from '@/plugins/plugin-management/error-messages';

import { PluginManagementRemoveInputSchema } from './input';

export class PluginManagementRemoveCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const validArgs = PluginManagementRemoveInputSchema.parse(args.args);
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

    const outputData: PluginManagementRemoveOutput = {
      name,
      removed: true,
      message: `Plugin ${name} removed from plugin-management state`,
    };

    return { result: outputData };
  }
}

export async function pluginManagementRemove(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new PluginManagementRemoveCommand().execute(args);
}

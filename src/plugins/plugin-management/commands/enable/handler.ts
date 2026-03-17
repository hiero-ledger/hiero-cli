/**
 * Enable Plugin Command Handler
 * Marks an existing plugin as enabled in the plugin-management state.
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { PluginManagementEnableOutput } from './output';

import { NotFoundError, StateError } from '@/core/errors';
import { PluginManagementEnableStatus } from '@/core/services/plugin-management/plugin-management-service.interface';
import { ERROR_MESSAGES } from '@/plugins/plugin-management/error-messages';

import { PluginManagementEnableInputSchema } from './input';

export class PluginManagementEnableCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const validArgs = PluginManagementEnableInputSchema.parse(args.args);
    const name = validArgs.name;

    logger.info('✅ Enabling plugin...');

    const result = api.pluginManagement.enablePlugin(name);

    if (result.status === PluginManagementEnableStatus.NotFound) {
      throw new NotFoundError(ERROR_MESSAGES.pluginNotFound(name), {
        context: { pluginName: name },
      });
    }

    if (result.status === PluginManagementEnableStatus.AlreadyEnabled) {
      throw new StateError(ERROR_MESSAGES.pluginAlreadyEnabled(name), {
        context: { pluginName: name },
      });
    }

    const outputData: PluginManagementEnableOutput = {
      name,
      path: result.entry?.path ?? 'unknown',
      enabled: true,
      message: `Plugin ${name} enabled successfully`,
    };

    return { result: outputData };
  }
}

export async function pluginManagementEnable(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new PluginManagementEnableCommand().execute(args);
}

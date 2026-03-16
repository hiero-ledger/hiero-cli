/**
 * List Plugins Command Handler
 * Handles listing all available plugins
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { PluginManagementListOutput } from './output';

export class PluginManagementListCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    logger.info('📋 Getting plugin list...');

    const entries = api.pluginManagement.listPlugins();

    const plugins = entries.map((entry) => ({
      name: entry.name,
      enabled: entry.enabled,
    }));

    const outputData: PluginManagementListOutput = {
      plugins,
      count: plugins.length,
    };

    return { result: outputData };
  }
}

export async function pluginManagementList(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new PluginManagementListCommand().execute(args);
}

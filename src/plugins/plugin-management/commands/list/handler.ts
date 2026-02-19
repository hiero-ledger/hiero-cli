/**
 * List Plugins Command Handler
 * Handles listing all available plugins
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ListPluginsOutput } from './output';

export async function getPluginList(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  logger.info('📋 Getting plugin list...');

  const entries = api.pluginManagement.listPlugins();

  const plugins = entries.map((entry) => ({
    name: entry.name,
    enabled: entry.enabled,
  }));

  const outputData: ListPluginsOutput = {
    plugins,
    count: plugins.length,
  };

  return { result: outputData };
}

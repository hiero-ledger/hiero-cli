/**
 * Reset Plugins Command Handler
 * Clears plugin-management state. Default plugins will be restored on next CLI run.
 * Custom plugins will be removed.
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ResetPluginsOutput } from './output';

import { DEFAULT_PLUGIN_STATE } from '@/core/shared/config/cli-options';

export async function resetPlugins(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  logger.info('🔄 Resetting plugin state...');

  const defaultPluginNames = new Set(DEFAULT_PLUGIN_STATE.map((m) => m.name));
  const currentPlugins = api.pluginManagement.listPlugins();
  const removedCustomCount = currentPlugins.filter(
    (p) => !defaultPluginNames.has(p.name),
  ).length;

  api.pluginManagement.resetPlugins();

  const message =
    removedCustomCount > 0
      ? `All default plugins will be restored on next CLI run. ${removedCustomCount} custom plugin(s) removed.`
      : 'All default plugins will be restored on next CLI run.';

  const outputData: ResetPluginsOutput = {
    reset: true,
    message,
    removedCustomCount,
  };

  return { result: outputData };
}

/**
 * Reset Plugins Command Handler
 * Clears plugin-management state. Default plugins will be restored on next CLI run.
 * Custom plugins will be removed.
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ResetPluginsOutput } from './output';

export async function resetPlugins(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  logger.info('🔄 Resetting plugin state...');

  api.pluginManagement.resetPlugins();

  const outputData: ResetPluginsOutput = {
    reset: true,
    message: 'Plugin state has been reset successfully.',
  };

  return { result: outputData };
}

/**
 * List Plugins Command Handler
 * Handles listing all available plugins
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

import type { ListPluginsOutput } from './output';
export async function getPluginList(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  logger.info('📋 Getting plugin list...');

  try {
    const entries = api.pluginManagement.listPlugins();

    const plugins = entries.map((entry) => ({
      name: entry.name,
      enabled: entry.enabled,
    }));

    const outputData: ListPluginsOutput = {
      plugins,
      count: plugins.length,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to list plugins', error),
    };
  }
}

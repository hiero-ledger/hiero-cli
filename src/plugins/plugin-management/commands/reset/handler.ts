/**
 * Reset Plugins Command Handler
 * Clears plugin-management state. Default plugins will be restored on next CLI run.
 * Custom plugins will be removed.
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ResetPluginsOutput } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

export async function resetPlugins(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  logger.info('🔄 Resetting plugin state...');

  try {
    api.pluginManagement.resetPlugins();

    const outputData: ResetPluginsOutput = {
      reset: true,
      message: 'Plugin state has been reset successfully.',
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to reset plugin state', error),
    };
  }
}

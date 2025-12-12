/**
 * Enable Plugin Command Handler
 * Marks an existing plugin as enabled in the plugin-management state.
 * Follows ADR-003 contract: returns CommandExecutionResult.
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { EnablePluginOutput } from './output';

import { PluginManagementEnableStatus } from '@/core/services/plugin-management/plugin-management-service.interface';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { ERROR_MESSAGES } from '@/plugins/plugin-management/error-messages';

import { EnablePluginInputSchema } from './input';
export async function enablePlugin(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Parse and validate args
  const validArgs = EnablePluginInputSchema.parse(args.args);

  const name = validArgs.name;

  logger.info('✅ Enabling plugin...');

  try {
    const result = api.pluginManagement.enablePlugin(name);

    if (result.status === PluginManagementEnableStatus.NotFound) {
      return {
        status: Status.Failure,
        errorMessage: ERROR_MESSAGES.pluginNotFound(name),
      };
    }

    if (result.status === PluginManagementEnableStatus.AlreadyEnabled) {
      return {
        status: Status.Failure,
        errorMessage: ERROR_MESSAGES.pluginAlreadyEnabled(name),
      };
    }

    const outputData: EnablePluginOutput = {
      name,
      path: result.entry?.path ?? 'unknown',
      enabled: true,
      message: `Plugin ${name} enabled successfully`,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to enable plugin', error),
    };
  }
}

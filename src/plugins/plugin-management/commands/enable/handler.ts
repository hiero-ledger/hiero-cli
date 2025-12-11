/**
 * Enable Plugin Command Handler
 * Marks an existing plugin as enabled in the plugin-management state.
 * Follows ADR-003 contract: returns CommandExecutionResult.
 */
import { CommandHandlerArgs } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../core/utils/errors';
import { AddPluginOutput } from '../add/output';
import { PluginManagementEnableStatus } from '../../../../core/services/plugin-management/plugin-management-service.interface';
import { EnablePluginInputSchema } from './input';
import { ERROR_MESSAGES } from '../../error-messages';
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

    const outputData: AddPluginOutput = {
      name,
      path: result.entry?.path ?? 'unknown',
      added: true,
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

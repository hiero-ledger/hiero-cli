/**
 * State Clear Command Handler
 * Handles clearing state data using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../core/utils/errors';
import { ClearStateOutput } from './output';

export async function clearState(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Extract command arguments
  const namespace = args.args.namespace as string | undefined;
  const confirm = args.args.confirm as boolean | undefined;

  logger.log('🗑️ Clearing state data...');

  try {
    if (!confirm) {
      const message = namespace
        ? `This will clear all data in namespace: ${namespace}. Add --confirm flag to proceed.`
        : 'This will clear ALL state data across all plugins. Add --confirm flag to proceed.';

      return {
        status: Status.Failure,
        errorMessage: message,
      };
    }

    if (namespace) {
      // Clear specific namespace
      const data = api.state.list<unknown>(namespace);
      const entriesCleared = data.length;

      api.state.clear(namespace);

      const outputData: ClearStateOutput = {
        cleared: true,
        namespace,
        entriesCleared,
        message: `Cleared ${entriesCleared} entries from namespace: ${namespace}`,
      };

      return {
        status: Status.Success,
        outputJson: JSON.stringify(outputData),
      };
    } else {
      // Clear all namespaces
      const namespaces = api.state.getNamespaces();
      let totalCleared = 0;

      for (const ns of namespaces) {
        const data = api.state.list<unknown>(ns);
        if (data.length > 0) {
          api.state.clear(ns);
          totalCleared += data.length;
        }
      }

      const outputData: ClearStateOutput = {
        cleared: true,
        entriesCleared: totalCleared,
        totalNamespaces: namespaces.length,
        message: `Cleared ${totalCleared} total entries across ${namespaces.length} namespaces`,
      };

      return {
        status: Status.Success,
        outputJson: JSON.stringify(outputData),
      };
    }
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to clear state data', error),
    };
  }
}

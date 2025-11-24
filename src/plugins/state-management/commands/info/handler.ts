/**
 * State Info Command Handler
 * Handles displaying state information using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../core/utils/errors';
import { StateInfoOutput } from './output';
import { NamespaceInfo } from '../../schema';

export async function stateInfo(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  logger.info('ℹ️  Getting state information...');

  try {
    const namespaces = api.state.getNamespaces();
    let totalEntries = 0;
    let totalSize = 0;
    const namespaceInfoList: NamespaceInfo[] = [];

    const storageDirectory = api.state.getStorageDirectory();
    const isInitialized = api.state.isInitialized();

    for (const ns of namespaces) {
      const data = api.state.list<unknown>(ns) || [];
      const entryCount = data.length;
      const size = JSON.stringify(data).length;

      totalEntries += entryCount;
      totalSize += size;

      namespaceInfoList.push({
        name: ns,
        entryCount,
        size,
        lastModified: new Date().toISOString(), // TODO: Get actual last modified time
      });
    }

    // Prepare output data
    const outputData: StateInfoOutput = {
      storageDirectory,
      isInitialized,
      totalEntries,
      totalSize,
      namespaces: namespaceInfoList,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to get state information', error),
    };
  }
}

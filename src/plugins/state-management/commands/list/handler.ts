/**
 * State List Command Handler
 * Handles listing state data using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../core/utils/errors';
import { ListStateOutput } from './output';
import { NamespaceInfo } from '../../schema';

export async function listState(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Extract command arguments
  const namespace = args.args.namespace as string | undefined;

  logger.log('📋 Listing state data...');

  try {
    const namespaces = api.state.getNamespaces();
    let totalEntries = 0;
    let totalSize = 0;
    const namespaceInfoList: NamespaceInfo[] = [];

    if (namespace) {
      // List specific namespace
      const data = api.state.list<unknown>(namespace);
      const size = JSON.stringify(data).length;
      const lastModified = new Date().toISOString(); // TODO: Get actual last modified time

      namespaceInfoList.push({
        name: namespace,
        entryCount: data.length,
        size,
        lastModified,
      });

      totalEntries = data.length;
      totalSize = size;
    } else {
      // List all namespaces
      for (const ns of namespaces) {
        const data = api.state.list<unknown>(ns);
        const size = JSON.stringify(data).length;
        const lastModified = new Date().toISOString(); // TODO: Get actual last modified time

        if (data.length > 0) {
          namespaceInfoList.push({
            name: ns,
            entryCount: data.length,
            size,
            lastModified,
          });

          totalEntries += data.length;
          totalSize += size;
        }
      }
    }

    // Prepare output data
    const outputData: ListStateOutput = {
      namespaces: namespaceInfoList,
      totalNamespaces: namespaceInfoList.length,
      totalEntries,
      totalSize,
      ...(namespace && { filteredNamespace: namespace }),
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to list state data', error),
    };
  }
}

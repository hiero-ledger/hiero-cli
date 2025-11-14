/**
 * State Backup Command Handler
 * Handles creating state backups using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../core/utils/errors';
import { StateBackupOutput } from './output';
import { BackupPayload } from '../../../../core/types/shared.types';
import * as fs from 'fs';
import * as path from 'path';

export async function stateBackup(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Extract command arguments
  const outputPath = args.args.dest as string | undefined;

  logger.log('💾 Creating state backup...');

  try {
    // Create backup data from all namespaces
    const namespaces = api.state.getNamespaces();

    const backup: BackupPayload = {
      timestamp: new Date().toISOString(),
      namespaces: {},
      metadata: {
        totalNamespaces: namespaces.length,
        totalSize: 0,
      },
    };

    for (const namespace of namespaces) {
      const data = api.state.list<unknown>(namespace);
      backup.namespaces[namespace] = data;
      backup.metadata.totalSize += JSON.stringify(data).length;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = outputPath || `hedera-cli-backup-${timestamp}.json`;
    const filepath = path.resolve(filename);

    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

    // Prepare output data
    const outputData: StateBackupOutput = {
      success: true,
      filePath: filepath,
      timestamp: backup.timestamp,
      totalNamespaces: namespaces.length,
      totalSize: backup.metadata.totalSize,
      namespaces,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to create backup', error),
    };
  }
}

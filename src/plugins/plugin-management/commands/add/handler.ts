/**
 * Add Plugin Command Handler
 * Adds a new plugin entry to the plugin-management state and enables it.
 *
 * Behavior:
 * - Reads the plugin manifest from the provided path to determine the plugin name.
 * - Fails if a plugin with the same name already exists in state.
 * - On success, creates a new PluginStateEntry with enabled = true.
 *
 * Follows ADR-003 contract: returns CommandExecutionResult.
 */
import type {
  CommandExecutionResult,
  CommandHandlerArgs,
  PluginStateEntry,
} from '@/core';
import type { AddPluginOutput } from './output';

import { PluginManagementCreateStatus } from '@/core/services/plugin-management/plugin-management-service.interface';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { loadPluginManifest } from '@/core/utils/load-plugin-manifest';
import { validatePluginPath } from '@/plugins/plugin-management/utils/plugin-path-validator';

import { AddPluginInputSchema } from './input';

export async function addPlugin(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Parse and validate ars
  const validArgs = AddPluginInputSchema.parse(args.args);

  const pluginPath = validArgs.path;

  logger.info('➕ Adding plugin from path...');

  try {
    // @TODO: Normalize plugin paths (relative vs absolute) once CLI packaging
    // as an npm package is finalized, so built-in and user-added plugins use
    // a consistent path format.
    const { resolvedPath, manifestPath } = await validatePluginPath(pluginPath);

    logger.info(`🔍 Loading plugin manifest from: ${manifestPath}`);

    const manifest = await loadPluginManifest(manifestPath);
    const pluginName = manifest.name;

    const newEntry: PluginStateEntry = {
      name: pluginName,
      path: resolvedPath,
      enabled: true,
    };
    const result = api.pluginManagement.addPlugin(newEntry);

    if (result.status === PluginManagementCreateStatus.Duplicate) {
      const outputData: AddPluginOutput = {
        name: pluginName,
        path: resolvedPath,
        added: false,
        message: `Plugin '${pluginName}' already exists in plugin-management state`,
      };

      return {
        status: Status.Failure,
        outputJson: JSON.stringify(outputData),
      };
    }

    const outputData: AddPluginOutput = {
      name: pluginName,
      path: resolvedPath,
      added: true,
      message: `Plugin '${pluginName}' added and enabled successfully`,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to add plugin', error),
    };
  }
}

/**
 * Add Plugin Command Handler
 * Adds a new plugin entry to the plugin-management state and enables it.
 *
 * Behavior:
 * - Reads the plugin manifest from the provided path to determine the plugin name.
 * - Fails if a plugin with the same name already exists in state.
 * - On success, creates a new PluginStateEntry with enabled = true.
 */
import type {
  CommandHandlerArgs,
  CommandResult,
  PluginStateEntry,
} from '@/core';
import type { AddPluginOutput } from './output';

import { StateError } from '@/core/errors';
import { PluginManagementCreateStatus } from '@/core/services/plugin-management/plugin-management-service.interface';
import { loadPluginManifest } from '@/core/utils/load-plugin-manifest';
import { ERROR_MESSAGES } from '@/plugins/plugin-management/error-messages';
import { validatePluginPath } from '@/plugins/plugin-management/utils/plugin-path-validator';

import { AddPluginInputSchema } from './input';

export async function addPlugin(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const validArgs = AddPluginInputSchema.parse(args.args);
  const pluginPath = validArgs.path;

  logger.info('➕ Adding plugin from path...');

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
    throw new StateError(ERROR_MESSAGES.pluginAlreadyExists(pluginName), {
      context: { pluginName, path: resolvedPath },
    });
  }

  const outputData: AddPluginOutput = {
    name: pluginName,
    path: resolvedPath,
    added: true,
    message: `Plugin '${pluginName}' added and enabled successfully`,
  };

  return { result: outputData };
}

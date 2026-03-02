/**
 * Add Plugin Command Handler
 * Adds a new plugin entry to the plugin-management state and enables it.
 *
 * Behavior:
 * - With --path: reads manifest from filesystem path.
 * - With --name: adds a default plugin by name (path resolved from CLI plugins dir).
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
import { resolveDefaultPluginPath } from '@/plugins/plugin-management/utils/resolve-default-plugin-path';

import { AddPluginInputSchema } from './input';

export async function addPlugin(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const validArgs = AddPluginInputSchema.parse(args.args);

  let pluginPath: string;
  if (validArgs.name) {
    pluginPath = resolveDefaultPluginPath(validArgs.name);
    logger.info(`➕ Adding default plugin: ${validArgs.name}...`);
  } else {
    pluginPath = validArgs.path!;
    logger.info('➕ Adding plugin from path...');
  }

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

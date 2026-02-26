/**
 * Add Plugin Command Handler
 * Adds a new plugin entry to the plugin-management state and enables it.
 *
 * Behavior:
 * - With --path: reads manifest from filesystem path.
 * - With --name: adds a default plugin by name (path resolved from CLI plugins dir).
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
import { DEFAULT_PLUGIN_STATE } from '@/core/shared/config/cli-options';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { getDefaultPluginPath } from '@/core/utils/get-default-plugin-path';
import { loadPluginManifest } from '@/core/utils/load-plugin-manifest';
import { ERROR_MESSAGES } from '@/plugins/plugin-management/error-messages';
import { validatePluginPath } from '@/plugins/plugin-management/utils/plugin-path-validator';

import { AddPluginInputSchema } from './input';

export async function addPlugin(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const validArgs = AddPluginInputSchema.parse(args.args);

  let pluginPath: string;
  if (validArgs.name) {
    const defaultPluginNames = new Set(DEFAULT_PLUGIN_STATE.map((m) => m.name));
    if (!defaultPluginNames.has(validArgs.name)) {
      return {
        status: Status.Failure,
        errorMessage: ERROR_MESSAGES.pluginNotDefault(validArgs.name),
      };
    }
    pluginPath = getDefaultPluginPath(validArgs.name);
    logger.info(`➕ Adding default plugin: ${validArgs.name}...`);
  } else {
    pluginPath = validArgs.path!;
    logger.info('➕ Adding plugin from path...');
  }

  try {
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

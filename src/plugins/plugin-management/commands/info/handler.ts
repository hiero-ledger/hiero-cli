/**
 * Plugin Info Command Handler
 * Returns plugin information based on the latest manifest.
 * Follows ADR-003 contract: returns CommandExecutionResult.
 */
import type {
  CommandExecutionResult,
  CommandHandlerArgs,
  PluginStateEntry,
} from '@/core';
import type { PluginInfoOutput } from './output';

import * as path from 'path';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { loadPluginManifest } from '@/core/utils/load-plugin-manifest';
import { ERROR_MESSAGES } from '@/plugins/plugin-management/error-messages';

import { PluginInfoInputSchema } from './input';

export async function getPluginInfo(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Parse and validate args
  const validArgs = PluginInfoInputSchema.parse(args.args);

  const name = validArgs.name;

  logger.info(`ℹ️  Getting plugin information: ${name}`);

  try {
    const pluginManagement = api.pluginManagement;
    const entry: PluginStateEntry | undefined =
      pluginManagement.getPlugin(name);
    if (!entry) {
      return {
        status: Status.Failure,
        errorMessage: ERROR_MESSAGES.pluginNotFound(name),
      };
    }

    const basePath =
      entry.path ?? path.resolve(__dirname, '../../../../plugins', entry.name);
    const manifestPath = path.resolve(basePath, 'manifest.js');

    logger.info(`🔍 Loading plugin manifest for info from: ${manifestPath}`);

    const manifest = await loadPluginManifest(manifestPath);

    const pluginInfo = {
      name: manifest.name,
      version: manifest.version ?? 'unknown',
      displayName: manifest.displayName ?? manifest.name,
      description:
        manifest.description ?? 'No description available for this plugin.',
      commands: manifest.commands?.map((command) => command.name) ?? [],
      enabled: entry.enabled,
    };

    const outputData: PluginInfoOutput = {
      plugin: pluginInfo,
      found: true,
      message: `Plugin ${name} information retrieved successfully`,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to get plugin information', error),
    };
  }
}

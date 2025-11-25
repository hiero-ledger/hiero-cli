/**
 * Plugin Info Command Handler
 * Returns plugin information based on the latest manifest.
 * Follows ADR-003 contract: returns CommandExecutionResult.
 */
import * as path from 'path';
import {
  CommandHandlerArgs,
  PluginStateEntry,
  PluginManifest,
} from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../core/utils/errors';
import { PluginInfoOutput } from './output';

export async function getPluginInfo(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;
  const { name } = args.args as { name: string };

  logger.info(`ℹ️  Getting plugin information: ${name}`);

  try {
    const pluginManagement = api.pluginManagement;
    const entry: PluginStateEntry | undefined =
      pluginManagement.getPlugin(name);
    if (!entry) {
      const notFound: PluginInfoOutput = {
        found: false,
        message: `Plugin ${name} not found in plugin-management state`,
      };
      return {
        status: Status.Success,
        outputJson: JSON.stringify(notFound),
      };
    }

    const basePath = entry.path ?? path.resolve('./dist/plugins', entry.name);
    const manifestPath = path.resolve(basePath, 'manifest.js');

    logger.info(`🔍 Loading plugin manifest for info from: ${manifestPath}`);

    const manifestModule = (await import(manifestPath)) as {
      default: PluginManifest;
    };

    const manifest = manifestModule.default;

    if (!manifest) {
      return {
        status: Status.Failure,
        errorMessage: `No valid manifest found at ${manifestPath}`,
      };
    }

    const pluginInfo = {
      name: manifest.name,
      version: manifest.version ?? 'unknown',
      displayName: manifest.displayName ?? manifest.name,
      description:
        manifest.description ?? 'No description available for this plugin.',
      commands: manifest.commands?.map((command) => command.name) ?? [],
      capabilities: manifest.capabilities ?? [],
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

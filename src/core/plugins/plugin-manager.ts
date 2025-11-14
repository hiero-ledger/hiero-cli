/**
 * Plugin Manager
 *
 * Direct plugin management without unnecessary layers
 */
import * as path from 'path';
import { Command } from 'commander';
import { CoreApi } from '../core-api/core-api.interface';
import { CommandHandlerArgs, PluginManifest } from './plugin.interface';
import { CommandSpec } from './plugin.types';
import { formatError } from '../utils/errors';
import { Status } from '../shared/constants';
import { filterReservedOptions } from '../utils/filter-reserved-options';
import { Logger } from '../services/logger/logger-service.interface';

interface LoadedPlugin {
  manifest: PluginManifest;
  path: string;
  status: 'loaded' | 'error';
}

export class PluginManager {
  private coreApi: CoreApi;
  private logger: Logger;
  private loadedPlugins: Map<string, LoadedPlugin> = new Map();
  private defaultPlugins: string[] = [];

  constructor(coreApi: CoreApi) {
    this.coreApi = coreApi;
    this.logger = coreApi.logger;
  }

  /**
   * Set default plugins
   */
  setDefaultPlugins(pluginPaths: string[]): void {
    this.defaultPlugins = pluginPaths;
  }

  /**
   * Initialize and load default plugins
   */
  async initialize(): Promise<void> {
    this.logger.log('🔌 Loading plugins...');

    for (const pluginPath of this.defaultPlugins) {
      try {
        await this.loadPluginFromPath(pluginPath);
        this.logger.log(`✅ Loaded: ${pluginPath}`);
      } catch {
        this.logger.log(`ℹ️  Plugin not available: ${pluginPath}`);
      }
    }

    // Register all namespaces with the state service
    const namespaces = this.getAllNamespaces();
    if (namespaces.length > 0) {
      this.coreApi.state.registerNamespaces(namespaces);
    }

    this.logger.log(`✅ Plugin system ready`);
  }

  /**
   * Register all plugin commands with Commander.js
   */
  registerCommands(program: Command): void {
    for (const plugin of this.loadedPlugins.values()) {
      this.registerPluginCommands(program, plugin);
    }
  }

  /**
   * Add a plugin dynamically
   */
  async addPlugin(pluginPath: string): Promise<void> {
    this.logger.log(`➕ Adding plugin: ${pluginPath}`);
    await this.loadPluginFromPath(pluginPath);
    this.logger.log(`✅ Plugin added: ${pluginPath}`);
  }

  /**
   * Remove a plugin
   */
  removePlugin(pluginName: string): void {
    this.logger.log(`➖ Removing plugin: ${pluginName}`);
    this.loadedPlugins.delete(pluginName);
    this.logger.log(`✅ Plugin removed: ${pluginName}`);
  }

  /**
   * List all plugins
   */
  listPlugins(): Array<{ name: string; path: string; status: string }> {
    return Array.from(this.loadedPlugins.values()).map((plugin) => ({
      name: plugin.manifest.name,
      path: plugin.path,
      status: plugin.status,
    }));
  }

  /**
   * Get all namespaces from loaded plugins
   */
  getAllNamespaces(): string[] {
    const namespaces = new Set<string>();

    for (const plugin of this.loadedPlugins.values()) {
      if (plugin.status === 'loaded' && plugin.manifest.stateSchemas) {
        for (const schema of plugin.manifest.stateSchemas) {
          namespaces.add(schema.namespace);
        }
      }
    }

    return Array.from(namespaces);
  }

  /**
   * Load a plugin from path
   */
  private async loadPluginFromPath(pluginPath: string): Promise<LoadedPlugin> {
    try {
      // Load manifest
      const manifestPath = path.resolve(pluginPath, 'manifest.js');
      const manifestModule = (await import(manifestPath)) as {
        default: PluginManifest;
      };
      const manifest = manifestModule.default;

      if (!manifest) {
        throw new Error(`No manifest found in ${pluginPath}`);
      }

      const loadedPlugin: LoadedPlugin = {
        manifest,
        path: pluginPath,
        status: 'loaded',
      };

      this.loadedPlugins.set(String(manifest.name), loadedPlugin);
      return loadedPlugin;
    } catch (error) {
      throw new Error(
        formatError(`Failed to load plugin from ${pluginPath}: `, error),
      );
    }
  }

  /**
   * Register commands for a specific plugin
   */
  private registerPluginCommands(program: Command, plugin: LoadedPlugin): void {
    const pluginName = plugin.manifest.name;
    const commands = plugin.manifest.commands || [];

    // Create plugin command group
    const pluginCommand = program
      .command(pluginName)
      .description(
        plugin.manifest.description || `Commands for ${pluginName} plugin`,
      );

    // Register each command
    for (const commandSpec of commands) {
      this.registerSingleCommand(pluginCommand, plugin, commandSpec);
    }

    this.logger.log(`✅ Registered commands for: ${pluginName}`);
  }

  /**
   * Register a single command
   */
  private registerSingleCommand(
    pluginCommand: Command,
    plugin: LoadedPlugin,
    commandSpec: CommandSpec,
  ): void {
    const commandName = String(commandSpec.name);
    const command = pluginCommand
      .command(commandName)
      .description(
        String(
          commandSpec.description ||
            commandSpec.summary ||
            `Execute ${commandName}`,
        ),
      );

    // Add options
    if (commandSpec.options) {
      const { allowed, filtered } = filterReservedOptions(commandSpec.options);

      if (filtered.length > 0) {
        this.logger.log(
          `⚠️  Plugin ${plugin.manifest.name} command ${commandName}: filtered reserved option(s) ${filtered
            .map((n) => `--${n}`)
            .join(', ')} (reserved by core CLI)`,
        );
      }

      for (const option of allowed) {
        const optionName = String(option.name);
        const short = option.short ? `-${String(option.short)}` : '';
        const long = `--${optionName}`;
        const combined = short ? `${short}, ${long}` : long;

        if (option.type === 'boolean') {
          command.option(
            combined,
            String(option.description || `Set ${optionName}`),
          );
        } else if (option.type === 'number') {
          const flags = `${combined} <value>`;
          if (option.required) {
            command.requiredOption(
              flags,
              String(option.description || `Set ${optionName}`),
              parseFloat,
            );
          } else {
            command.option(
              flags,
              String(option.description || `Set ${optionName}`),
              parseFloat,
            );
          }
        } else if (option.type === 'array') {
          const flags = `${combined} <values>`;
          if (option.required) {
            command.requiredOption(
              flags,
              String(option.description || `Set ${optionName}`),
              (value: unknown) => String(value).split(','),
            );
          } else {
            command.option(
              flags,
              String(option.description || `Set ${optionName}`),
              (value: unknown) => String(value).split(','),
            );
          }
        } else {
          const flags = `${combined} <value>`;
          if (option.required) {
            command.requiredOption(
              flags,
              String(option.description || `Set ${optionName}`),
            );
          } else {
            command.option(
              flags,
              String(option.description || `Set ${optionName}`),
            );
          }
        }
      }
    }

    // Set up action handler
    command.action(async (...args: unknown[]) => {
      await this.executePluginCommand(plugin, commandSpec, args);
    });
  }

  /**
   * Execute a plugin command
   */
  private async executePluginCommand(
    plugin: LoadedPlugin,
    commandSpec: CommandSpec,
    args: unknown[],
  ): Promise<void> {
    const command = args[args.length - 1] as Command;
    const options = command.opts();
    const commandArgs = command.args;

    const handlerArgs: CommandHandlerArgs = {
      args: {
        ...options,
        _: commandArgs,
      },
      api: this.coreApi,
      state: this.coreApi.state,
      config: this.coreApi.config,
      logger: this.logger,
    };

    const result = await commandSpec.handler(handlerArgs);

    // Validate that output spec is present (required per CommandSpec type)
    if (!commandSpec.output) {
      throw new Error(
        `Command ${commandSpec.name} must define an output specification`,
      );
    }

    // ADR-003: If command has output spec, expect handler to return result
    if (!result) {
      throw new Error(
        `Handler for ${commandSpec.name} must return CommandExecutionResult when output spec is defined`,
      );
    }

    const executionResult = result;

    // Handle non-success statuses
    if (executionResult.status !== Status.Success) {
      throw new Error(
        executionResult.errorMessage ||
          `Command ${commandSpec.name} failed with status: ${executionResult.status}`,
      );
    }

    // Handle successful execution with output
    if (executionResult.outputJson) {
      try {
        // Use OutputHandlerService to format and display output
        this.coreApi.output.handleCommandOutput({
          outputJson: executionResult.outputJson,
          schema: commandSpec.output.schema,
          template: commandSpec.output.humanTemplate,
          format: this.coreApi.output.getFormat(),
        });
      } catch (error) {
        throw new Error(
          `Failed to handle output from ${commandSpec.name}: ${formatError('', error)}`,
        );
      }
    }
  }
}

/**
 * Plugin Manager
 *
 * Direct plugin management without unnecessary layers
 */
import type { Command } from 'commander';
import type {
  CommandHandlerArgs,
  CommandSpec,
  PluginManifest,
  PluginStateEntry,
} from '@/core';
import type { CoreApi } from '@/core/core-api';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { PluginManagementService } from '@/core/services/plugin-management/plugin-management-service.interface';

import * as path from 'path';

import { Status } from '@/core/shared/constants';
import { ensureCliInitialized } from '@/core/utils/ensure-cli-initialized';
import { filterReservedOptions } from '@/core/utils/filter-reserved-options';
import { registerDisabledPlugin } from '@/core/utils/register-disabled-plugin';

interface LoadedPlugin {
  manifest: PluginManifest;
  path: string;
  status: 'loaded' | 'error';
}

export class PluginManager {
  private coreApi: CoreApi;
  private loadedPlugins: Map<string, LoadedPlugin> = new Map();
  private defaultPlugins: string[] = [];
  private logger: Logger;
  private pluginManagement: PluginManagementService;

  constructor(coreApi: CoreApi) {
    this.coreApi = coreApi;
    this.logger = coreApi.logger;
    this.pluginManagement = coreApi.pluginManagement;
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
    this.logger.info('🔌 Loading plugins...');

    for (const pluginPath of this.defaultPlugins) {
      await this.loadPluginFromPath(pluginPath);
      this.logger.info(`✅ Loaded: ${pluginPath}`);
    }

    this.logger.info(`✅ Plugin system ready`);
  }

  /**
   * Initialize plugin-management state with default plugins if not present.
   * Returns the current list of plugin state entries.
   */
  initializePluginState(defaultState: PluginManifest[]): PluginStateEntry[] {
    const existingEntries = this.pluginManagement.listPlugins();

    if (existingEntries.length === 0) {
      this.logger.info(
        '[PLUGIN-MANAGEMENT] Initializing default plugin state (first run)...',
      );

      const initialState: PluginStateEntry[] = defaultState.map((manifest) => {
        const pluginName = manifest.name;

        return {
          name: pluginName,
          enabled: true,
          description: manifest.description,
        };
      });

      for (const plugin of initialState) {
        this.pluginManagement.savePluginState(plugin);
      }

      return initialState;
    }

    return existingEntries;
  }

  /**
   * Initialize plugin state and configure default plugin loading.
   * Returns the current list of plugin state entries.
   */
  setupPlugins(defaultState: PluginManifest[]): PluginStateEntry[] {
    const pluginState = this.initializePluginState(defaultState);

    const enabledPluginPaths = pluginState
      .map((state) => {
        if (!state.enabled) {
          return undefined;
        }
        const defaultEntry = defaultState.find(
          (entry) => entry.name === state.name,
        );
        if (defaultEntry) {
          return this.getDefaultPluginPath(state.name);
        } else {
          return state.path;
        }
      })
      .filter((p): p is string => Boolean(p));
    this.setDefaultPlugins(enabledPluginPaths);

    return pluginState;
  }

  /**
   * Fully initialize plugins: seed state, register disabled stubs, load all.
   */
  async initializePlugins(
    program: Command,
    defaultState: PluginManifest[],
  ): Promise<PluginStateEntry[]> {
    const pluginState = this.setupPlugins(defaultState);
    registerDisabledPlugin(program, pluginState, this.coreApi.output);
    await this.initialize();
    return pluginState;
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
    this.logger.info(`➕ Adding plugin: ${pluginPath}`);
    await this.loadPluginFromPath(pluginPath);
    this.logger.info(`✅ Plugin added: ${pluginPath}`);
  }

  /**
   * Remove a plugin
   */
  removePlugin(pluginName: string): void {
    this.logger.info(`➖ Removing plugin: ${pluginName}`);
    this.loadedPlugins.delete(pluginName);
    this.logger.info(`✅ Plugin removed: ${pluginName}`);
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
        // Use centralized error handler for consistent error formatting
        return this.coreApi.output.handleError({
          error: new Error(`No manifest found in ${pluginPath}`),
        });
      }

      const loadedPlugin: LoadedPlugin = {
        manifest,
        path: pluginPath,
        status: 'loaded',
      };

      this.loadedPlugins.set(manifest.name, loadedPlugin);
      return loadedPlugin;
    } catch (error) {
      // Use centralized error handler for consistent error formatting
      return this.coreApi.output.handleError({ error });
    }
  }

  private getDefaultPluginPath(name: string): string {
    return path.resolve(__dirname, '../../plugins', name);
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

    this.logger.info(`✅ Registered commands for: ${pluginName}`);
  }

  /**
   * Register a single command
   * Uses centralized error handler on failure to ensure consistent error formatting
   */
  private registerSingleCommand(
    pluginCommand: Command,
    plugin: LoadedPlugin,
    commandSpec: CommandSpec,
  ): void {
    try {
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
        const { allowed, filtered } = filterReservedOptions(
          commandSpec.options,
        );

        if (filtered.length > 0) {
          this.logger.info(
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
    } catch (error) {
      // Use centralized error handler for consistent error formatting
      this.coreApi.output.handleError({ error });
    }
  }

  /**
   * Execute a plugin command
   */
  private async executePluginCommand(
    _plugin: LoadedPlugin,
    commandSpec: CommandSpec,
    args: unknown[],
  ): Promise<void> {
    const command = args[args.length - 1] as Command;
    const options = command.opts();
    const commandArgs = command.args;
    const pluginName = command.parent?.name() || command.name();

    const PLUGINS_DISABLED_FROM_INITIALIZATION = [
      'network',
      'config',
      'plugin-management',
    ];
    if (!PLUGINS_DISABLED_FROM_INITIALIZATION.includes(pluginName)) {
      await ensureCliInitialized(this.coreApi);
    }

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

    // Validate that output spec is present (required per CommandSpec type)
    if (!commandSpec.output) {
      this.coreApi.output.handleError({
        error: new Error(
          `Command ${commandSpec.name} configuration error: Command must define an output specification`,
        ),
      });
    }

    // Execute command handler with error handling
    // @TODO POC_ERROR_HANDLING: Ensure all handlers are migrated to ADR-007 throw-based model
    /* eslint-disable @typescript-eslint/no-explicit-any */
    let result: any;
    try {
      result = await commandSpec.handler(handlerArgs);
    } catch (error) {
      // ADR-007: Core catches thrown errors and formats them
      this.coreApi.output.handleError({ error });
    }

    // ADR-003: If command has output spec, expect handler to return result
    if (!result) {
      this.coreApi.output.handleError({
        error: new Error(
          `Command ${commandSpec.name} handler error: Handler must return CommandExecutionResult or CommandResult when output spec is defined`,
        ),
      });
    }

    // ADR-007: Check if it's the new CommandResult format
    // @TODO POC_ERROR_HANDLING: This dual-contract support should be removed once migration is complete
    if ('result' in result && !('status' in result)) {
      try {
        this.coreApi.output.handleResult({
          /* eslint-disable @typescript-eslint/no-unsafe-member-access */
          result: result.result,
          template: commandSpec.output.humanTemplate,
          format: this.coreApi.output.getFormat(),
        });
        return;
      } catch (error) {
        this.coreApi.output.handleError({ error });
      }
    }

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    const executionResult = result;

    // Handle non-success statuses (Old ADR-003 path)
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    if (executionResult.status !== Status.Success) {
      this.coreApi.output.handleError({
        /* eslint-disable @typescript-eslint/no-unsafe-argument */
        error: new Error(
          executionResult.errorMessage || `Status: ${executionResult.status}`,
        ),
      });
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
        this.coreApi.output.handleError({ error });
      }
    }
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
  }
}

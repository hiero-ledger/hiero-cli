/**
 * Plugin Manager
 *
 * Direct plugin management without unnecessary layers
 */
import type { Command, OptionValues } from 'commander';
import type {
  CommandHandlerArgs,
  CommandSpec,
  PluginManifest,
  PluginStateEntry,
} from '@/core';
import type { CoreApi } from '@/core/core-api';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { PluginManagementService } from '@/core/services/plugin-management/plugin-management-service.interface';

import * as Handlebars from 'handlebars';
import * as path from 'path';

import { Status } from '@/core/shared/constants';
import { OptionType } from '@/core/types/shared.types';
import { requireConfirmation } from '@/core/utils/confirmation';
import { ensureCliInitialized } from '@/core/utils/ensure-cli-initialized';
import { formatAndExitWithError } from '@/core/utils/error-handler';
import { filterReservedOptions } from '@/core/utils/filter-reserved-options';
import { loadPluginManifest } from '@/core/utils/load-plugin-manifest';
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
    registerDisabledPlugin(program, pluginState);
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
   * Exit with formatted error using the current output format
   * Wrapper for formatAndExitWithError with automatic format detection
   */
  private exitWithError(context: string, error: unknown): never {
    return formatAndExitWithError(
      context,
      error,
      this.coreApi.output.getFormat(),
    );
  }

  /**
   * Load a plugin from path
   */
  private async loadPluginFromPath(pluginPath: string): Promise<LoadedPlugin> {
    try {
      // Load manifest
      const manifestPath = path.resolve(pluginPath, 'manifest.js');
      const manifest = await loadPluginManifest(manifestPath);

      const loadedPlugin: LoadedPlugin = {
        manifest,
        path: pluginPath,
        status: 'loaded',
      };

      this.loadedPlugins.set(manifest.name, loadedPlugin);
      return loadedPlugin;
    } catch (error) {
      // Use centralized error handler for consistent error formatting
      return this.exitWithError(
        `Failed to load plugin from ${pluginPath}`,
        error,
      );
    }
  }

  private getDefaultPluginPath(name: string): string {
    return path.resolve(__dirname, '../../plugins', name);
  }

  private shouldSkipConfirmation(opts: OptionValues): boolean {
    return Boolean(opts.confirm);
  }

  /**
   * Register commands for a specific plugin
   */
  private registerPluginCommands(program: Command, plugin: LoadedPlugin): void {
    const pluginName = plugin.manifest.name;
    const commands = plugin.manifest.commands || [];

    const skipConfirmation = this.shouldSkipConfirmation(program.opts());

    // Create plugin command group
    const pluginCommand = program
      .command(pluginName)
      .description(
        plugin.manifest.description || `Commands for ${pluginName} plugin`,
      );

    // Register each command
    for (const commandSpec of commands) {
      this.registerSingleCommand(
        pluginCommand,
        plugin,
        commandSpec,
        skipConfirmation,
      );
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
    skipConfirmation: boolean,
  ): void {
    try {
      const commandName = String(commandSpec.name);
      const command = this.buildCommand(pluginCommand, commandSpec);
      // Add options
      if (commandSpec.options) {
        const { allowed, filteredLong, filteredShort } = filterReservedOptions(
          commandSpec.options,
        );

        if (filteredLong.length > 0 || filteredShort.length > 0) {
          const longDesc = filteredLong.map((n) => `--${n}`).join(', ');
          const shortDesc = filteredShort.map((s) => `-${s}`).join(', ');
          const combined = [longDesc, shortDesc].filter(Boolean).join(', ');

          throw new Error(
            `Plugin ${plugin.manifest.name} command ${commandName} uses reserved option(s): ${combined}. These are reserved by the core CLI.`,
          );
        }

        for (const option of allowed) {
          const optionName = String(option.name);
          const short = option.short ? `-${String(option.short)}` : '';
          const long = `--${optionName}`;
          const combined = short ? `${short}, ${long}` : long;
          const flags = `${combined} <value>`;
          const description = String(option.description || `Set ${optionName}`);

          const addOption = <T>(
            parser?: (value: string, previous: T) => T,
            useValueFlag = true,
          ) => {
            const optionFlags = useValueFlag ? flags : combined;
            if (option.required) {
              // Commander treats the third argument as an optional parser/transform function
              if (parser) {
                command.requiredOption(optionFlags, description, parser);
              } else {
                command.requiredOption(optionFlags, description);
              }
            } else {
              if (parser) {
                command.option(optionFlags, description, parser);
              } else {
                command.option(optionFlags, description);
              }
            }
          };

          switch (option.type) {
            case OptionType.BOOLEAN:
              // boolean flags don't take a value placeholder or parser
              addOption<boolean | undefined>(undefined, false);
              break;
            case OptionType.NUMBER:
              addOption<number>((value) => parseFloat(value));
              break;
            case OptionType.ARRAY: {
              const parseArray = (value: string) => String(value).split(',');
              addOption<string[]>(parseArray);
              break;
            }
            case OptionType.REPEATABLE: {
              const parseRepeatable = (
                value: string,
                previous: string[] | undefined,
              ) => {
                const arr = previous ?? [];
                arr.push(value);
                return arr;
              };
              addOption<string[]>(parseRepeatable);
              break;
            }
            default:
              // default to a simple string option (no parser)
              addOption<string | undefined>();
          }
        }
      }

      // Set up action handler
      command.action(async (...args: unknown[]) => {
        await this.executePluginCommand(
          plugin,
          commandSpec,
          args,
          skipConfirmation,
        );
      });
    } catch (error) {
      // Use centralized error handler for consistent error formatting
      this.exitWithError(
        `Failed to register command ${commandSpec.name} from plugin ${plugin.manifest.name}`,
        error,
      );
    }
  }

  // Handle pre-execution confirmation if required by command spec.
  private async handleConfirmation(
    commandSpec: CommandSpec,
    handlerArgs: CommandHandlerArgs,
    skipConfirmation: boolean,
  ): Promise<void> {
    if (!commandSpec.requireConfirmation || skipConfirmation) {
      return;
    }

    const format = this.coreApi.output.getFormat();
    if (format !== 'human') {
      return;
    }

    const skipConfirmations =
      this.coreApi.config.getOption<boolean>('skip_confirmations');
    if (skipConfirmations) {
      this.logger.debug(
        'Confirmation skipped due to skip_confirmations config',
      );
      return;
    }

    let message: string;
    try {
      const template = Handlebars.compile(commandSpec.requireConfirmation);
      message = template(handlerArgs.args);
    } catch (error) {
      throw new Error(
        `Failed to render confirmation template: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const confirmed = await requireConfirmation(message);
    this.coreApi.output.emptyLine();
    if (!confirmed) {
      throw new Error('Operation cancelled by user');
    }
  }

  /**
   * Execute a plugin command
   */
  private async executePluginCommand(
    _plugin: LoadedPlugin,
    commandSpec: CommandSpec,
    args: unknown[],
    skipConfirmation: boolean,
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

    await this.handleConfirmation(commandSpec, handlerArgs, skipConfirmation);

    // Validate that output spec is present (required per CommandSpec type)
    if (!commandSpec.output) {
      this.exitWithError(
        `Command ${commandSpec.name} configuration error`,
        new Error('Command must define an output specification'),
      );
    }

    // Execute command handler with error handling
    let result;
    try {
      result = await commandSpec.handler(handlerArgs);
    } catch (error) {
      this.exitWithError(`Command ${commandSpec.name} execution failed`, error);
    }

    // ADR-003: If command has output spec, expect handler to return result
    if (!result) {
      this.exitWithError(
        `Command ${commandSpec.name} handler error`,
        new Error(
          'Handler must return CommandExecutionResult when output spec is defined',
        ),
      );
    }

    const executionResult = result;

    // Handle non-success statuses
    if (executionResult.status !== Status.Success) {
      this.exitWithError(
        `Command ${commandSpec.name} failed`,
        new Error(
          executionResult.errorMessage || `Status: ${executionResult.status}`,
        ),
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
        this.exitWithError(
          `Failed to format output for ${commandSpec.name}`,
          error,
        );
      }
    }
  }

  private buildCommand(pluginCommand: Command, commandSpec: CommandSpec) {
    const commandName = String(commandSpec.name);
    let command = pluginCommand
      .command(commandName)
      .description(
        String(
          commandSpec.description ||
            commandSpec.summary ||
            `Execute ${commandName}`,
        ),
      );
    if (commandSpec.excessArguments) {
      command = command.allowUnknownOption(true).allowExcessArguments(true);
    }
    return command;
  }
}

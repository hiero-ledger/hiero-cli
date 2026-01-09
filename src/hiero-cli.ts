#!/usr/bin/env node

import './core/utils/json-serialize';

import { program } from 'commander';

import pkg from '../package.json';

import { createCoreApi } from './core';
import { PluginManager } from './core/plugins/plugin-manager';
import { DEFAULT_PLUGIN_STATE } from './core/shared/config/cli-options';
import { validateOutputFormat } from './core/shared/validation/validate-output-format.zod';
import { addDisabledPluginsHelp } from './core/utils/add-disabled-plugins-help';
import {
  formatAndExitWithError,
  setGlobalOutputFormat,
  setupGlobalErrorHandlers,
} from './core/utils/error-handler';

program
  .name('hcli')
  .version(pkg.version || '0.0.0')
  .description('A CLI tool for managing Hedera environments')
  .option('--format <type>', 'Output format: human (default) or json');

// Initialize the simplified plugin system
async function initializeCLI() {
  const coreApi = createCoreApi();

  try {
    program.parseOptions(process.argv.slice(2));
    const opts = program.opts();
    const format = validateOutputFormat(opts.format);

    coreApi.output.setFormat(format);

    // Setup global error handlers with validated format
    setGlobalOutputFormat(format);
    setupGlobalErrorHandlers();

    const pluginManager = new PluginManager(coreApi);

    // Initialize plugins, register disabled stubs, and load all manifests
    const pluginState = await pluginManager.initializePlugins(
      program,
      DEFAULT_PLUGIN_STATE,
    );

    // Register plugin commands
    pluginManager.registerCommands(program);

    // Add disabled plugins section to help output
    addDisabledPluginsHelp(program, pluginState);

    coreApi.logger.info('✅ CLI ready');

    // Parse arguments and execute command
    await program.parseAsync(process.argv);
    process.exit(0);
  } catch (error) {
    formatAndExitWithError('CLI initialization failed', error);
  }
}

// Start the CLI
void initializeCLI();

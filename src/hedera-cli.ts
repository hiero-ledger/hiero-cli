#!/usr/bin/env node

import { program } from 'commander';
import { PluginManager } from './core/plugins/plugin-manager';
import { createCoreApi } from './core/core-api';
import { CoreApiConfig } from './core/core-api/core-api-config';
import './core/utils/json-serialize';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json') as { version?: string };

program
  .version(pkg.version || '0.0.0')
  .description('A CLI tool for managing Hedera environments')
  .option('--format <type>', 'Output format: human (default) or json');

// Initialize the simplified plugin system
async function initializeCLI() {
  try {
    console.error('🚀 Starting Hedera CLI...');

    // Pre-parse arguments to get format before creating core API
    program.parseOptions(process.argv.slice(2));
    const opts = program.opts();

    const formatOption = opts.format as string | undefined;
    const format = formatOption === 'json' ? 'json' : 'human';

    // Create core API config
    const coreApiConfig: CoreApiConfig = {
      format,
    };

    // Create plugin manager
    const coreApi = createCoreApi(coreApiConfig);

    const pluginManager = new PluginManager(coreApi);

    // Set default plugins
    pluginManager.setDefaultPlugins([
      './dist/plugins/account', // Default account plugin
      './dist/plugins/token', // Token management plugin
      './dist/plugins/network', // Network plugin
      './dist/plugins/plugin-management', // Plugin management plugin
      './dist/plugins/credentials', // Credentials management plugin
      './dist/plugins/state-management', // State management plugin
      './dist/plugins/topic', // Topic management plugin
      './dist/plugins/hbar', // HBAR plugin
      './dist/plugins/config', // global config plugin
    ]);

    // Initialize plugins
    await pluginManager.initialize();

    // Register plugin commands
    pluginManager.registerCommands(program);

    console.error('✅ CLI ready');

    // Parse arguments and execute command
    await program.parseAsync(process.argv);
    process.exit(0);
  } catch (error) {
    console.error('❌ CLI execution failed:', error);
    process.exit(1);
  }
}

// Start the CLI
initializeCLI();

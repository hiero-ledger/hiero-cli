#!/usr/bin/env node

// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

import { program } from 'commander';
import { setColorEnabled } from './utils/color';
import { installGlobalErrorHandlers } from './utils/errors';
import { Logger } from './utils/logger';
import { setGlobalOutputMode } from './utils/output';
import { PluginManager } from './core/plugins/plugin-manager';
import { createCoreApi } from './core/core-api';
import { CoreApiConfig } from './core/core-api/core-api-config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json') as { version?: string };
const logger = Logger.getInstance();

program
  .version(pkg.version || '0.0.0')
  .description('A CLI tool for managing Hedera environments')
  //.option('-v, --verbose', 'Enable verbose logging')
  .option('-q, --quiet', 'Quiet mode (only errors)')
  .option('--debug', 'Enable debug logging')
  .option(
    '--json',
    'Machine-readable JSON output (deprecated, use --format json)',
  )
  .option('--format <type>', 'Output format: human (default) or json')
  .option('--no-color', 'Disable ANSI colors');

// Apply logging options and store format preference
let globalFormat: 'human' | 'json' = 'human';

program.hook('preAction', () => {
  const opts = program.opts();

  if (opts.debug) process.env.HCLI_DEBUG = 'true';
  if (opts.verbose) logger.setLevel('verbose');
  if (opts.quiet) logger.setLevel('quiet');

  setColorEnabled(opts.color !== false);

  // Set global output mode based on already parsed format
  setGlobalOutputMode({ json: globalFormat === 'json' });
});

// Initialize the simplified plugin system
async function initializeCLI() {
  try {
    console.error('🚀 Starting Hedera CLI...');

    // Pre-parse arguments to get format before creating core API
    program.parseOptions(process.argv.slice(2));
    const opts = program.opts();

    const formatOption = opts.format as string | undefined;
    const format: string = formatOption || (opts.json ? 'json' : 'human');
    const initialFormat = format as 'human' | 'json';

    // Update global format
    globalFormat = initialFormat;

    // Create core API config
    const coreApiConfig: CoreApiConfig = {
      format: initialFormat,
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
  } catch (error) {
    console.error('❌ CLI initialization failed:', error);
    process.exit(1);
  }

  try {
    // Parse arguments and execute command
    installGlobalErrorHandlers();
    await program.parseAsync(process.argv);
    process.exit(0);
  } catch (error) {
    console.error('❌ CLI execution failed:', error);
    process.exit(1);
  }
}

// Start the CLI
initializeCLI().catch((error) => {
  console.error('❌ CLI startup failed:', error);
  process.exit(1);
});

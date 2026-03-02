#!/usr/bin/env node

import './core/utils/json-serialize';

import { CommanderError, program } from 'commander';

import pkg from '../package.json';

import { createCoreApi } from './core';
import { PluginManager } from './core/plugins/plugin-manager';
import { ErrorBoundaryServiceImpl } from './core/services/error-boundary/error-boundary-service';
import { DEFAULT_PLUGIN_STATE } from './core/shared/config/cli-options';
import { validateNetwork } from './core/shared/validation/validate-network.zod';
import { validateOutputFormat } from './core/shared/validation/validate-output-format.zod';
import { addDisabledPluginsHelp } from './core/utils/add-disabled-plugins-help';
import { resolvePayer } from './core/utils/resolve-payer';

program
  .name('hcli')
  .version(pkg.version || '0.0.0')
  .description('A CLI tool for managing Hedera environments')
  .option('--format <type>', 'Output format: human (default) or json')
  .option(
    '-N, --network <network>',
    'Target network (testnet, mainnet, previewnet, localnet)',
  )
  .option(
    '-P, --payer <payer>',
    'Payer account (alias or account-id:private-key format)',
  )
  .option('--confirm', 'Skip confirmation prompts')
  .showHelpAfterError('use --help for available options')
  .configureHelp({
    showGlobalOptions: true,
  })
  .exitOverride()
  .configureOutput({ outputError: () => {} });

// Initialize the simplified plugin system
async function initializeCLI() {
  const coreApi = createCoreApi();
  const errorBoundary = new ErrorBoundaryServiceImpl(
    coreApi.output,
    coreApi.logger,
  );

  try {
    program.parseOptions(process.argv.slice(2));
    const opts = program.opts();
    const format = validateOutputFormat(opts.format);

    coreApi.output.setFormat(format);

    if (format === 'json') {
      program.showHelpAfterError(false);
    } else {
      program.showHelpAfterError('use --help for available options');
    }

    const networkOverride = validateNetwork(opts.network || opts.N);

    if (networkOverride) {
      coreApi.network.setNetwork(networkOverride);
    }

    const payer = (opts.payer || opts.P) as string | undefined;
    if (payer) {
      await resolvePayer(payer, coreApi);
    }

    // Setup global error handlers with validated format
    errorBoundary.registerGlobalHandlers();

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
    if (error instanceof CommanderError && error.exitCode === 0) {
      process.exit(0);
    }
    errorBoundary.handle(error);
    process.exit(1);
  }
}

// Start the CLI
void initializeCLI();

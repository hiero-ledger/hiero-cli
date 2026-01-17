import type { Command } from 'commander';
import type { PluginStateEntry } from '@/core/plugins/plugin.interface';
import type { OutputService } from '@/core/services/output/output-service.interface';

import { PluginError } from '@/core/errors';

/**
 * Registers stub commands for disabled plugins in Commander.js.
 * This allow users to see error message that plugin is disabled
 * instead of getting "command not found" errors.
 *
 * @param programInstance - The Commander.js program instance to register commands on
 * @param plugins - Array of plugin state entries to check for disabled plugins
 * @param outputService - Output service for consistent error formatting
 */
export function registerDisabledPlugin(
  programInstance: Command,
  plugins: PluginStateEntry[],
  outputService: OutputService,
): void {
  plugins
    .filter((plugin) => !plugin.enabled)
    .forEach((plugin) => {
      const command = programInstance
        // Hide from main command list
        .command(plugin.name, { hidden: true })
        .description('Currently disabled')
        .allowUnknownOption(true)
        .allowExcessArguments(true);

      // Override help to show disabled message instead of default help
      const disabledMessage = `Plugin '${plugin.name}' is disabled.`;
      command.helpOption(false);
      command.option('-h, --help', 'display help for command');

      // Override the help method to show disabled message
      command.help = () => {
        outputService.handleError({ error: new PluginError(disabledMessage) });
      };

      command.action(() => {
        outputService.handleError({ error: new PluginError(disabledMessage) });
      });
    });
}

import { Command } from 'commander';
import { PluginStateEntry } from '../plugins/plugin.interface';
import { formatAndExitWithError } from './error-handler';
import { Logger } from '../services/logger/logger-service.interface';

/**
 * Registers stub commands for disabled plugins in Commander.js.
 * This allow users to see error message that plugin is disabled
 * instead of getting "command not found" errors.
 *
 * @param programInstance - The Commander.js program instance to register commands on
 * @param plugins - Array of plugin state entries to check for disabled plugins
 */
export function registerDisabledPlugin(
  programInstance: Command,
  plugins: PluginStateEntry[],
  logger: Logger,
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
        formatAndExitWithError(
          'Plugin disabled',
          new Error(disabledMessage),
          logger,
        );
      };

      command.action(() => {
        formatAndExitWithError(
          'Plugin disabled',
          new Error(disabledMessage),
          logger,
        );
      });
    });
}

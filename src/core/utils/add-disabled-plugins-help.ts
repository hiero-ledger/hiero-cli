import { Command } from 'commander';
import { PluginStateEntry } from '../plugins/plugin.interface';

/**
 * Adds a "Disabled Plugins" section to the help output showing all disabled plugins.
 * Uses the same formatting as Commander.js default command list for consistency.
 *
 * @param programInstance - The Commander.js program instance
 * @param pluginState - Array of plugin state entries to check for disabled plugins
 */
export function addDisabledPluginsHelp(
  programInstance: Command,
  pluginState: PluginStateEntry[],
): void {
  const disabledPlugins = pluginState.filter((plugin) => !plugin.enabled);
  if (disabledPlugins.length > 0) {
    programInstance.addHelpText('after', () => {
      // Calculate padding width to match Commander.js format
      // Find the longest command name from all commands (enabled + disabled)
      const allCommands = programInstance.commands;
      const allPluginNames = [
        ...allCommands.map((cmd) => cmd.name()),
        ...disabledPlugins.map((p) => p.name),
      ];
      const maxNameLength = Math.max(
        ...allPluginNames.map((name) => name.length),
      );

      // Commander.js uses 2 spaces for indentation and 2 spaces between name and description
      const itemIndent = 2;
      const spacerWidth = 2;

      let text = '\nDisabled Plugins:\n';
      disabledPlugins.forEach((plugin) => {
        const description =
          plugin.description || `Commands for ${plugin.name} plugin`;
        // Format to match Commander.js: indent + padded name + spacer + description
        const paddedName = plugin.name.padEnd(maxNameLength);
        text += `${' '.repeat(itemIndent)}${paddedName}${' '.repeat(spacerWidth)}${description}\n`;
      });
      return text;
    });
  }
}

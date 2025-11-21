import type { PluginStateEntry } from '../../../../../core/plugins/plugin.interface';

export const CUSTOM_PLUGIN_ENTRY: PluginStateEntry = {
  name: 'custom-plugin',
  path: 'dist/plugins/custom-plugin',
  enabled: true,
};

export const CUSTOM_PLUGIN_DISABLED_ENTRY: PluginStateEntry = {
  ...CUSTOM_PLUGIN_ENTRY,
  enabled: false,
};

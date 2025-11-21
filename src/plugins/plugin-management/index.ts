/**
 * Plugin Management Plugin Index
 * Exports the plugin manifest and command handlers
 */
import { addPlugin } from './commands/add/handler';
import { removePlugin } from './commands/remove/handler';
import { enablePlugin } from './commands/enable/handler';
import { disablePlugin } from './commands/disable/handler';
import { getPluginList } from './commands/list/handler';
import { getPluginInfo } from './commands/info/handler';

export { pluginManagementManifest } from './manifest';

export {
  addPlugin,
  removePlugin,
  enablePlugin,
  disablePlugin,
  getPluginList,
  getPluginInfo,
};

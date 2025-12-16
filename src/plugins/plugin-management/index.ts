/**
 * Plugin Management Plugin Index
 * Exports the plugin manifest and command handlers
 */
import { addPlugin } from './commands/add/handler';
import { disablePlugin } from './commands/disable/handler';
import { enablePlugin } from './commands/enable/handler';
import { getPluginInfo } from './commands/info/handler';
import { getPluginList } from './commands/list/handler';
import { removePlugin } from './commands/remove/handler';

export { pluginManagementManifest } from './manifest';

export {
  addPlugin,
  disablePlugin,
  enablePlugin,
  getPluginInfo,
  getPluginList,
  removePlugin,
};

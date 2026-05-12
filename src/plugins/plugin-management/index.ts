/**
 * Plugin Management Plugin Index
 * Exports the plugin management manifest and command handlers
 */
import { pluginManagementAdd } from './commands/add/handler';
import { pluginManagementDisable } from './commands/disable/handler';
import { pluginManagementEnable } from './commands/enable/handler';
import { pluginManagementInfo } from './commands/info/handler';
import { pluginManagementList } from './commands/list/handler';
import { pluginManagementRemove } from './commands/remove/handler';
import { pluginManagementReset } from './commands/reset/handler';

export { pluginManagementManifest } from './manifest';

export {
  pluginManagementAdd,
  pluginManagementDisable,
  pluginManagementEnable,
  pluginManagementInfo,
  pluginManagementList,
  pluginManagementRemove,
  pluginManagementReset,
};

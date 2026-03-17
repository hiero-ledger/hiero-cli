/**
 * Remove Plugin Command Index
 * Exports the command handler
 */
export {
  pluginManagementRemove,
  PluginManagementRemoveCommand,
} from './handler';
export type { PluginManagementRemoveOutput } from './output';
export {
  PLUGIN_MANAGEMENT_REMOVE_TEMPLATE,
  PluginManagementRemoveOutputSchema,
} from './output';

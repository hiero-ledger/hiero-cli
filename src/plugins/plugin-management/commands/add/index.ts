/**
 * Add Plugin Command Index
 * Exports the command handler
 */
export { pluginManagementAdd, PluginManagementAddCommand } from './handler';
export type { PluginManagementAddOutput } from './output';
export {
  PLUGIN_MANAGEMENT_ADD_TEMPLATE,
  PluginManagementAddOutputSchema,
} from './output';

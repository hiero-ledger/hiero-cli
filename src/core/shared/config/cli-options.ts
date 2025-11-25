import type { PluginManifest } from '../../plugins/plugin.types';
import accountPluginManifest from '../../../plugins/account/manifest';
import tokenPluginManifest from '../../../plugins/token/manifest';
import networkPluginManifest from '../../../plugins/network/manifest';
import pluginManagementManifest from '../../../plugins/plugin-management/manifest';
import credentialsPluginManifest from '../../../plugins/credentials/manifest';
import topicPluginManifest from '../../../plugins/topic/manifest';
import hbarPluginManifest from '../../../plugins/hbar/manifest';
import configPluginManifest from '../../../plugins/config/manifest';

export const RESERVED_LONG_OPTIONS = new Set<string>([
  'format',
  'json',
  'output',
  'script',
  'color',
  'no-color',
  'verbose',
  'quiet',
  'debug',
  'help',
  'version',
]);

export const DEFAULT_PLUGIN_STATE: PluginManifest[] = [
  accountPluginManifest,
  tokenPluginManifest,
  networkPluginManifest,
  pluginManagementManifest,
  credentialsPluginManifest,
  topicPluginManifest,
  hbarPluginManifest,
  configPluginManifest,
];

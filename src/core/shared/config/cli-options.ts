import type { PluginManifest } from '@/core/plugins/plugin.types';

import accountPluginManifest from '@/plugins/account/manifest';
import configPluginManifest from '@/plugins/config/manifest';
import credentialsPluginManifest from '@/plugins/credentials/manifest';
import hbarPluginManifest from '@/plugins/hbar/manifest';
import historyPluginManifest from '@/plugins/history/manifest';
import networkPluginManifest from '@/plugins/network/manifest';
import pluginManagementManifest from '@/plugins/plugin-management/manifest';
import tokenPluginManifest from '@/plugins/token/manifest';
import topicPluginManifest from '@/plugins/topic/manifest';

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
  'network',
]);

export const DEFAULT_PLUGIN_STATE: PluginManifest[] = [
  accountPluginManifest,
  tokenPluginManifest,
  networkPluginManifest,
  pluginManagementManifest,
  credentialsPluginManifest,
  topicPluginManifest,
  hbarPluginManifest,
  historyPluginManifest,
  configPluginManifest,
];

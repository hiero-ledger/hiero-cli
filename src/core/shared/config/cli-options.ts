import type { PluginManifest } from '@/core/plugins/plugin.types';

import accountPluginManifest from '@/plugins/account/manifest';
import configPluginManifest from '@/plugins/config/manifest';
import contractPluginManifest from '@/plugins/contract/manifest';
import contractErc20PluginManifest from '@/plugins/contract-erc20/manifest';
import credentialsPluginManifest from '@/plugins/credentials/manifest';
import hbarPluginManifest from '@/plugins/hbar/manifest';
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
  'payer',
]);

export const RESERVED_SHORT_OPTIONS = new Set<string>([
  'h', // help (Commander default)
  'V', // version (Commander default)
  'N', // network
]);

export const DEFAULT_PLUGIN_STATE: PluginManifest[] = [
  accountPluginManifest,
  tokenPluginManifest,
  networkPluginManifest,
  pluginManagementManifest,
  credentialsPluginManifest,
  topicPluginManifest,
  hbarPluginManifest,
  contractPluginManifest,
  configPluginManifest,
  contractErc20PluginManifest,
];

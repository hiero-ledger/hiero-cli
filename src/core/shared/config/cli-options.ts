import type { PluginManifest } from '@/core/plugins/plugin.types';

import accountPluginManifest from '@/plugins/account/manifest';
import batchPluginManifest from '@/plugins/batch/manifest';
import configPluginManifest from '@/plugins/config/manifest';
import contractPluginManifest from '@/plugins/contract/manifest';
import contractErc20PluginManifest from '@/plugins/contract-erc20/manifest';
import contractErc721PluginManifest from '@/plugins/contract-erc721/manifest';
import credentialsPluginManifest from '@/plugins/credentials/manifest';
import eip712PluginManifest from '@/plugins/eip712/manifest';
import faucetPluginManifest from '@/plugins/faucet/manifest';
import hbarPluginManifest from '@/plugins/hbar/manifest';
import networkPluginManifest from '@/plugins/network/manifest';
import pluginManagementManifest from '@/plugins/plugin-management/manifest';
import schedulePluginManifest from '@/plugins/schedule/manifest';
import swapPluginManifest from '@/plugins/swap/manifest';
import tokenPluginManifest from '@/plugins/token/manifest';
import topicPluginManifest from '@/plugins/topic/manifest';
import x402PluginManifest from '@/plugins/x402/manifest';

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
  'confirm',
  'max-transaction-fee',
]);

export const RESERVED_SHORT_OPTIONS = new Set<string>([
  'h', // help (Commander default)
  'v', // version
  'N', // network
  'P', // payer
  'F', // format
  'Y', // confirm
  'M', // max-transaction-fee
]);

export const DEFAULT_PLUGIN_STATE: PluginManifest[] = [
  accountPluginManifest,
  batchPluginManifest,
  schedulePluginManifest,
  tokenPluginManifest,
  networkPluginManifest,
  pluginManagementManifest,
  credentialsPluginManifest,
  topicPluginManifest,
  hbarPluginManifest,
  contractPluginManifest,
  configPluginManifest,
  contractErc20PluginManifest,
  contractErc721PluginManifest,
  swapPluginManifest,
  eip712PluginManifest,
  faucetPluginManifest,
  x402PluginManifest,
];

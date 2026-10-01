/**
 * Default network configurations for NetworkService
 * This is the single source of truth for network settings
 */
import { SupportedNetwork } from '@/core/types/shared.types';

export interface DefaultNetworkConfig {
  rpcUrl: string;
  mirrorNodeUrl: string;
}

export interface DefaultLocalnetNode {
  localNodeAddress: string;
  localNodeAccountId: string;
  localNodeMirrorAddressGRPC: string;
}

export interface LocalnetEndpoints {
  consensusNodeEndpoint: string;
  mirrorNodeUrl: string;
  jsonRpcRelayUrl: string;
  /** Explorer base URL — NetworkService appends `/<network>`, e.g. `/localnet` */
  explorerUrl: string;
}

export const DEFAULT_NETWORK: SupportedNetwork = SupportedNetwork.TESTNET;

const DEFAULT_LOCALNET_ENDPOINTS: LocalnetEndpoints = {
  consensusNodeEndpoint: 'localhost:35211',
  mirrorNodeUrl: 'http://localhost:38081',
  jsonRpcRelayUrl: 'http://localhost:37546',
  explorerUrl: 'http://localhost:38080',
};

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, '');

const resolveEnvValue = (
  envValue: string | undefined,
  fallback: string,
): string => {
  const trimmed = envValue?.trim();
  return trimmed ? trimmed : fallback;
};

/**
 * Localnet endpoints can be overridden through the environment (`.env.test` for
 * tests) because the network is not always published on this process's
 * localhost: a Solo running on the host is reached from a container through
 * `host.docker.internal` instead.
 *
 * Keep this module free of imports from `shared/constants`: it pulls in the
 * SDK, which closes a module cycle with `mirrornode/types`.
 */
export const resolveLocalnetEndpoints = (
  env: NodeJS.ProcessEnv,
): LocalnetEndpoints => ({
  consensusNodeEndpoint: resolveEnvValue(
    env.CONSENSUS_NODE_ENDPOINT,
    DEFAULT_LOCALNET_ENDPOINTS.consensusNodeEndpoint,
  ),
  mirrorNodeUrl: normalizeBaseUrl(
    resolveEnvValue(
      env.MIRROR_NODE_URL,
      DEFAULT_LOCALNET_ENDPOINTS.mirrorNodeUrl,
    ),
  ),
  jsonRpcRelayUrl: resolveEnvValue(
    env.JSON_RPC_RELAY_URL,
    DEFAULT_LOCALNET_ENDPOINTS.jsonRpcRelayUrl,
  ),
  explorerUrl: normalizeBaseUrl(
    resolveEnvValue(env.EXPLORER_URL, DEFAULT_LOCALNET_ENDPOINTS.explorerUrl),
  ),
});

export const LOCALNET_ENDPOINTS: LocalnetEndpoints = resolveLocalnetEndpoints(
  process.env,
);

export const DEFAULT_NETWORKS: Record<string, DefaultNetworkConfig> = {
  localnet: {
    rpcUrl: LOCALNET_ENDPOINTS.jsonRpcRelayUrl,
    mirrorNodeUrl: `${LOCALNET_ENDPOINTS.mirrorNodeUrl}/api/v1`,
  },
  testnet: {
    rpcUrl: 'https://testnet.hashio.io/api',
    mirrorNodeUrl: 'https://testnet.mirrornode.hedera.com/api/v1',
  },
  previewnet: {
    rpcUrl: 'https://previewnet.hashio.io/api',
    mirrorNodeUrl: 'https://previewnet.mirrornode.hedera.com/api/v1',
  },
  mainnet: {
    rpcUrl: 'https://mainnet.hashio.io/api',
    mirrorNodeUrl: 'https://mainnet.mirrornode.hedera.com/api/v1',
  },
};

export const DEFAULT_LOCALNET_NODE: DefaultLocalnetNode = {
  localNodeAddress: LOCALNET_ENDPOINTS.consensusNodeEndpoint,
  localNodeAccountId: '0.0.3',
  localNodeMirrorAddressGRPC: 'localhost:35600',
};

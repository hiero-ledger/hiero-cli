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

export const DEFAULT_NETWORK: SupportedNetwork = SupportedNetwork.TESTNET;

export const DEFAULT_NETWORKS: Record<string, DefaultNetworkConfig> = {
  localnet: {
    rpcUrl: 'http://localhost:7546',
    mirrorNodeUrl: 'http://localhost:5551/api/v1',
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
  localNodeAddress: '127.0.0.1:50211',
  localNodeAccountId: '0.0.3',
  localNodeMirrorAddressGRPC: '127.0.0.1:5600',
};

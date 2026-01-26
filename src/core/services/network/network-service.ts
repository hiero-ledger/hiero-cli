/**
 * Network Service Implementation
 * Manages network configuration using StateService with namespace
 */
import type { ResolvedKey } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { Logger } from '@/core/services/logger/logger-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type {
  LocalnetConfig,
  NetworkConfig,
  NetworkOperator,
  NetworkService,
} from './network-service.interface';

import { HASHSCAN_BASE_URL } from '@/core/shared/constants';

import {
  DEFAULT_LOCALNET_NODE,
  DEFAULT_NETWORK,
  DEFAULT_NETWORKS,
} from './network.config';

const NAMESPACE = 'network-config';
const CURRENT_NETWORK_KEY = 'current';

export class NetworkServiceImpl implements NetworkService {
  private readonly state: StateService;
  private readonly logger: Logger;
  private network: SupportedNetwork;
  private payer: ResolvedKey | null = null;

  constructor(state: StateService, logger: Logger) {
    this.state = state;
    this.logger = logger;
    const storedNetwork = this.state.get<SupportedNetwork>(
      NAMESPACE,
      CURRENT_NETWORK_KEY,
    );
    this.network = storedNetwork || DEFAULT_NETWORK;
    this.logger.debug(`[NETWORK] Initialized with network: ${this.network}`);
  }

  getCurrentNetwork(): SupportedNetwork {
    this.logger.debug(`[NETWORK] Getting current network: ${this.network}`);
    return this.network;
  }

  setNetwork(network: SupportedNetwork): void {
    this.logger.debug(
      `[NETWORK] Setting network from ${this.network} to ${network}`,
    );
    this.network = network;
  }

  getAvailableNetworks(): string[] {
    const networks = Object.keys(DEFAULT_NETWORKS);
    this.logger.debug(
      `[NETWORK] Getting available networks: ${networks.join(', ')}`,
    );
    return networks;
  }

  switchNetwork(network: SupportedNetwork): void {
    if (!this.isNetworkAvailable(network)) {
      throw new Error(`Network not available: ${network}`);
    }
    this.setNetwork(network);
    this.state.set<string>(NAMESPACE, CURRENT_NETWORK_KEY, network);
  }

  getNetworkConfig(network: string): NetworkConfig {
    const config = DEFAULT_NETWORKS[network];

    if (!config) {
      throw new Error(`Network configuration not found: ${network}`);
    }

    return {
      name: network,
      rpcUrl: config.rpcUrl,
      mirrorNodeUrl: config.mirrorNodeUrl,
      chainId: network === 'mainnet' ? '0x127' : '0x128',
      explorerUrl: `${HASHSCAN_BASE_URL}${network}`,
      isTestnet: network !== 'mainnet',
    };
  }

  isNetworkAvailable(network: string): boolean {
    const available = network in DEFAULT_NETWORKS;
    this.logger.debug(
      `[NETWORK] Checking if network is available: ${network} -> ${available}`,
    );
    return available;
  }

  getLocalnetConfig(): LocalnetConfig {
    this.logger.debug(`[NETWORK] Getting localnet configuration`);
    return DEFAULT_LOCALNET_NODE;
  }

  setOperator(
    network: SupportedNetwork,
    operator: { accountId: string; keyRefId: string },
  ): void {
    this.logger.debug(
      `[NETWORK] Setting operator for network ${network}: ${operator.accountId}`,
    );
    this.state.set(NAMESPACE, `${network}Operator`, operator);
  }

  getOperator(
    network: SupportedNetwork,
  ): { accountId: string; keyRefId: string } | null {
    const operator = this.state.get<{ accountId: string; keyRefId: string }>(
      NAMESPACE,
      `${network}Operator`,
    );
    this.logger.debug(
      `[NETWORK] Getting operator for network ${network}: ${operator ? operator.accountId : 'none'}`,
    );
    return operator || null;
  }

  //@TODO Replace everywhere where the current network is manually retrieved and manually checked whether the operator exists.
  getCurrentOperatorOrThrow(): NetworkOperator {
    const currentNetwork = this.getCurrentNetwork();
    const operator = this.getOperator(currentNetwork);

    if (!operator) {
      throw new Error('The network operator is not set.');
    }

    return operator;
  }

  setPayer(payer: ResolvedKey | null): void {
    if (payer) {
      this.logger.debug(`[NETWORK] Setting payer: ${payer.accountId}`);
    }
    this.payer = payer;
  }

  getPayer(): ResolvedKey | null {
    return this.payer;
  }
}

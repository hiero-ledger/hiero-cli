/**
 * Interface for network management operations
 * All network services must implement this interface
 */
import type { ResolvedKey } from '@/core/services/key-resolver/key-resolver-service.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';

export interface NetworkService {
  /**
   * Get the current active network
   */
  getCurrentNetwork(): SupportedNetwork;

  /**
   * Set the current network (temporary, in-memory only)
   */
  setNetwork(network: SupportedNetwork): void;

  /**
   * Get list of available networks
   */
  getAvailableNetworks(): string[];

  /**
   * Switch to a different network
   */
  switchNetwork(network: SupportedNetwork): void;

  /**
   * Get configuration for a specific network
   */
  getNetworkConfig(network: string): NetworkConfig;

  /**
   * Check if a network is available
   */
  isNetworkAvailable(network: string): boolean;

  /**
   * Get localnet-specific configuration
   */
  getLocalnetConfig(): LocalnetConfig;

  /**
   * Set operator for a specific network
   */
  setOperator(
    network: SupportedNetwork,
    operator: { accountId: string; keyRefId: string },
  ): void;

  /**
   * Get operator for a specific network
   */
  getOperator(network: SupportedNetwork): NetworkOperator | null;

  /**
   * Get operator for current network or throw
   */
  getCurrentOperatorOrThrow(): NetworkOperator;

  /**
   * Set payer override (session-scoped, in-memory only)
   * Used to override the default operator as payer for all transactions
   */
  setPayerOverride(payer: ResolvedKey | null): void;

  /**
   * Set payer override string (from CLI flag, before resolution)
   */
  setPayerOverrideString(payer: string | null): void;

  /**
   * Get payer override string
   */
  getPayerOverrideString(): string | null;

  /**
   * Get payer override
   */
  getPayerOverrideResolved(): ResolvedKey | null;
}

export interface NetworkOperator {
  accountId: string;
  keyRefId: string;
}

// Network configuration types
export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  mirrorNodeUrl: string;
  chainId: string;
  explorerUrl?: string;
  isTestnet: boolean;
  operator?: {
    accountId: string;
    keyRefId: string;
  };
}

export interface LocalnetConfig {
  localNodeAddress: string;
  localNodeAccountId: string;
  localNodeMirrorAddressGRPC: string;
}

export interface NetworkInfo {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  rpcUrl: string;
  mirrorNodeUrl: string;
  lastChecked: string;
}

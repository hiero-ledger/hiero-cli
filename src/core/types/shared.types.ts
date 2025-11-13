/**
 * Shared Type Definitions
 * Common data structures used across the Hedera CLI
 */

import { CustomFee } from '@hashgraph/sdk';

/**
 * Supported Hedera networks
 * Used across all services for network identification
 */
export type SupportedNetwork =
  | 'mainnet'
  | 'testnet'
  | 'previewnet'
  | 'localnet';

/**
 * Default key manager options for KMS
 */
export type DefaultKeyManagerType = 'local' | 'encrypted_local';

/**
 * Account data structure
 */
export interface Account {
  name: string;
  accountId: string;
  type: 'ECDSA' | 'ED25519';
  publicKey: string;
  evmAddress: string;
  solidityAddress: string;
  solidityAddressFull: string;
  privateKey: string;
  network: 'mainnet' | 'testnet' | 'previewnet';
}

/**
 * Token data structure
 */
export interface Token {
  tokenId: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  treasury: string;
  adminKey: string;
  supplyKey: string;
  freezeKey?: string;
  wipeKey?: string;
  kycKey?: string;
  pauseKey?: string;
  feeScheduleKey?: string;
  customFees: CustomFee[];
  network: 'mainnet' | 'testnet' | 'previewnet';
}

/**
 * Topic data structure
 */
export interface Topic {
  topicId: string;
  name: string;
  memo: string;
  adminKey: string;
  submitKey: string;
  autoRenewAccount: string;
  autoRenewPeriod: number;
  expirationTime: string;
  network: 'mainnet' | 'testnet' | 'previewnet';
}

/**
 * Script data structure
 */
export interface Script {
  name: string;
  content: string;
  language: string;
  version: string;
  description?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Credentials data structure
 */
export interface Credentials {
  accountId: string;
  privateKey: string;
  network: string;
  isDefault: boolean;
  createdAt: string;
}

/**
 * Network configuration
 */
export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  mirrorNodeUrl: string;
  chainId: string;
  explorerUrl?: string;
}

export type BackupPayload = {
  timestamp: string;
  namespaces: Record<string, unknown[]>;
  metadata: {
    totalNamespaces: number;
    totalSize: number;
  };
};

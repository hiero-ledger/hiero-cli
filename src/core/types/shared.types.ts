/**
 * Shared Type Definitions
 * Common data structures used across the Hiero CLI
 */

import type { CustomFee } from '@hashgraph/sdk';
import type { CompileOptions } from 'solc';
import type { KeyAlgorithm } from '@/core/shared/constants';

export enum AliasType {
  Account = 'account',
  Token = 'token',
  Key = 'key',
  Topic = 'topic',
  Contract = 'contract',
}

/**
 * Supported Hedera networks
 * Used across all services for network identification
 */
export enum SupportedNetwork {
  MAINNET = 'mainnet',
  TESTNET = 'testnet',
  PREVIEWNET = 'previewnet',
  LOCALNET = 'localnet',
}

/**
 * Discriminator for orchestrator hook payloads (batch execute vs schedule sign/verify).
 */
export enum OrchestratorSource {
  BATCH = 'batch',
  SCHEDULE = 'schedule',
}

export enum NetworkChainId {
  MAINNET = 295,
  TESTNET = 296,
  PREVIEWNET = 297,
  LOCALNET = 298,
}

export const NetworkChainMap: Record<SupportedNetwork, NetworkChainId> = {
  [SupportedNetwork.MAINNET]: NetworkChainId.MAINNET,
  [SupportedNetwork.TESTNET]: NetworkChainId.TESTNET,
  [SupportedNetwork.PREVIEWNET]: NetworkChainId.PREVIEWNET,
  [SupportedNetwork.LOCALNET]: NetworkChainId.LOCALNET,
};

/**
 * Account data structure
 */
export interface Account {
  name: string;
  accountId: string;
  type: KeyAlgorithm;
  publicKey: string;
  evmAddress: string;
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

export enum SupplyType {
  FINITE = 'FINITE',
  INFINITE = 'INFINITE',
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
 * Solc compiler interface
 */
export interface SolcCompiler {
  compile(input: string, options?: CompileOptions): string;
  version(): string;
}

export enum OptionType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  REPEATABLE = 'repeatable',
}

export enum EntityReferenceType {
  ALIAS = 'alias',
  ENTITY_ID = 'entity_id',
  EVM_ADDRESS = 'evm_address',
}

export enum MirrorNodeRequestOrderParameter {
  ASC = 'asc',
  DESC = 'desc',
}

export enum MirrorTransactionResult {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

export interface TransactionStatus {
  status: 'pending' | 'success' | 'failed';
  transactionId: string;
  error?: string;
}

export interface TransactionReceipt {
  status: TransactionStatus;
  accountId?: string;
  tokenId?: string;
  topicId?: string;
  topicSequenceNumber?: number;
  serials?: string[];
}

export interface TransactionResult {
  transactionId: string;
  success: boolean;
  receipt: TransactionReceipt;
  accountId?: string;
  tokenId?: string;
  topicId?: string;
  contractId?: string;
  topicSequenceNumber?: number;
  scheduleId?: string;
  consensusTimestamp: string;
}

export interface BatchDataItem {
  transactionBytes: string;
  order: number;
  command: string;
  keyRefIds: string[];
  normalizedParams: Record<string, unknown>;
  transactionId?: string;
}

export interface BatchData {
  name: string;
  keyRefId: string;
  executed: boolean;
  success: boolean;
  transactions: BatchDataItem[];
}

export interface BatchExecuteTransactionResult {
  updatedBatchData: BatchData;
}

export interface ScheduledData {
  name: string;
  executed: boolean;
  success: boolean;
  command: string;
  transactionId: string;
  normalizedParams: Record<string, unknown>;
}

export interface ScheduledDataVerifyResult {
  scheduledData: ScheduledData;
}

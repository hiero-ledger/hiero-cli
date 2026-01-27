/**
 * Type definitions for Hedera Mirror Node API responses
 */
import type { KeyAlgorithm } from '@/core/shared/constants';

import { SupportedNetwork } from '@/core/types/shared.types';

// Base URL mapping for different networks
export const NetworkToBaseUrl = new Map<SupportedNetwork, string>([
  [
    SupportedNetwork.MAINNET,
    'https://mainnet-public.mirrornode.hedera.com/api/v1',
  ],
  [SupportedNetwork.TESTNET, 'https://testnet.mirrornode.hedera.com/api/v1'],
  [
    SupportedNetwork.PREVIEWNET,
    'https://previewnet.mirrornode.hedera.com/api/v1',
  ],
  [SupportedNetwork.LOCALNET, 'http://localhost:5551/api/v1'],
]);

export type MirrorNodeKeyType = 'ECDSA_SECP256K1' | 'ED25519';

// Account API Response
export interface AccountAPIResponse {
  account: string;
  alias?: string;
  balance: {
    balance: number;
    timestamp: string;
  };
  created_timestamp: string;
  evm_address?: string;
  key?: {
    _type: MirrorNodeKeyType;
    key: string;
  };
  max_automatic_token_associations: number;
  memo: string;
  receiver_sig_required: boolean;
}

export interface AccountResponse {
  accountId: string;
  accountPublicKey: string;
  balance: {
    balance: number;
    timestamp: string;
  };
  evmAddress?: string;
  keyAlgorithm: KeyAlgorithm;
}

// Token Balance Response
export interface TokenBalancesResponse {
  account: string;
  balance: number;
  tokens: TokenBalanceInfo[];
  timestamp: string;
}

export interface TokenBalanceInfo {
  token_id: string;
  balance: number;
  decimals: number;
}

// Token Info
export interface TokenInfo {
  token_id: string;
  symbol: string;
  name: string;
  decimals: string;
  total_supply: string;
  max_supply: string;
  type: string;
  treasury: string;
  admin_key?: {
    _type: string;
    key: string;
  };
  kyc_key?: {
    _type: string;
    key: string;
  };
  freeze_key?: {
    _type: string;
    key: string;
  };
  wipe_key?: {
    _type: string;
    key: string;
  };
  supply_key?: {
    _type: string;
    key: string;
  };
  fee_schedule_key?: {
    _type: string;
    key: string;
  };
  pause_key?: {
    _type: string;
    key: string;
  };
  created_timestamp: string;
  deleted: boolean;
  default_freeze_status: boolean;
  default_kyc_status: boolean;
  pause_status: string;
  memo: string;
}

// Topic Info
export interface TopicInfo {
  topic_id: string;
  admin_key?: {
    _type: string;
    key: string;
  };
  submit_key?: {
    _type: string;
    key: string;
  };
  memo: string;
  running_hash: string;
  sequence_number: number;
  consensus_timestamp: string;
  auto_renew_account?: string;
  auto_renew_period: number;
  expiration_timestamp?: string;
  created_timestamp: string;
  deleted: boolean;
}

// Topic Messages
export interface TopicMessage {
  consensus_timestamp: string;
  topic_id: string;
  message: string;
  running_hash: string;
  sequence_number: number;
  chunk_info?: {
    initial_transaction_id: string;
    number: number;
    total: number;
  };
}

export interface TopicMessagesAPIResponse {
  messages: TopicMessage[];
  links?: {
    next?: string;
  };
}

export interface TopicMessageQueryParams {
  topicId: string;
  sequenceNumber: number;
}

export interface TopicMessagesQueryParams {
  topicId: string;
  filters?: Filter[];
}

export interface TopicMessageResponse {
  topicId: string;
  data: TopicMessage;
}

export interface TopicMessagesResponse {
  topicId: string;
  messages: TopicMessage[];
}

// Transaction Details
export interface TransactionDetailsResponse {
  transactions: Array<{
    transaction_id: string;
    consensus_timestamp: string;
    valid_start_timestamp: string;
    charged_tx_fee: number;
    memo_base64?: string;
    result: string;
    transaction_hash: string;
    name: string;
    node: string;
    transaction_fee: number;
    scheduled: boolean;
    transfers: Array<{
      account: string;
      amount: number;
    }>;
    token_transfers?: Array<{
      account: string;
      amount: number;
      token_id: string;
    }>;
    nft_transfers?: Array<{
      account: string;
      amount: number;
      token_id: string;
      serial_number: number;
    }>;
    assessed_custom_fees?: Array<{
      amount: number;
      collector_account_id: string;
      token_id?: string;
    }>;
  }>;
}

// Contract Info
export interface ContractInfo {
  contract_id: string;
  account: string;
  created_timestamp: string;
  deleted: boolean;
  memo: string;
  evm_address?: string;
  admin_key?: {
    _type: string;
    key: string;
  };
  auto_renew_account?: string;
  auto_renew_period: number;
  expiration_timestamp?: string;
  file_id?: string;
  max_automatic_token_associations: number;
  obtainer_id?: string;
  permanent_removal?: boolean;
  proxy_account_id?: string;
  staked_account_id?: string;
  staked_node_id?: number;
  stake_period_start?: string;
}

// Token Airdrops
export interface TokenAirdropsResponse {
  airdrops: Array<{
    account_id: string;
    amount: number;
    token_id: string;
    timestamp: string;
  }>;
}

// Exchange Rate
export interface ExchangeRateResponse {
  current_rate: {
    cent_equivalent: number;
    expiration_time: string;
    hbar_equivalent: number;
  };
  next_rate: {
    cent_equivalent: number;
    expiration_time: string;
    hbar_equivalent: number;
  };
  timestamp: string;
}

// NFT Info
export interface NftInfo {
  account_id: string;
  created_timestamp: string;
  delegating_spender?: string | null;
  deleted: boolean;
  metadata?: string;
  modified_timestamp: string;
  serial_number: number;
  spender_id?: string | null;
  token_id: string;
}

export interface Filter {
  field: string;
  operation: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne';
  value: number | string;
}

export interface ContractCallRequest {
  /**
   * Block identifier.
   * Defaults to 'latest' when not provided.
   */
  block?: string;
  /**
   * Hex-encoded call data (function selector + encoded parameters).
   */
  data?: string;
  /**
   * When true, executes the call in estimation mode (no state changes).
   */
  estimate?: boolean;
  /**
   * Hex-encoded 20 byte EVM address of the caller.
   */
  from?: string;
  /**
   * Maximum amount of gas to be used for the call.
   */
  gas?: number;
  /**
   * Gas price to use for the call.
   */
  gasPrice?: number;
  /**
   * Hex-encoded 20 byte EVM address of the contract to call.
   *
   * This is the only required field.
   */
  to: string;
  /**
   * Amount of value (in tinybars) to send with the call.
   */
  value?: number;
}

export interface ContractCallResponse {
  /**
   * Hex-encoded result of the EVM execution.
   */
  result: string;
}

/**
 * Type definitions for Hedera Mirror Node API responses
 */
import type { KeyAlgorithm } from '@/core/shared/constants';
import type { MirrorNodeRequestOrderParameter } from '@/core/types/shared.types';

import { SupportedNetwork } from '@/core/types/shared.types';

// Base URL mapping for different networks
export const NetworkToBaseUrl = new Map<SupportedNetwork, string>([
  [SupportedNetwork.MAINNET, 'https://mainnet-public.mirrornode.hedera.com'],
  [SupportedNetwork.TESTNET, 'https://testnet.mirrornode.hedera.com'],
  [SupportedNetwork.PREVIEWNET, 'https://previewnet.mirrornode.hedera.com'],
  [SupportedNetwork.LOCALNET, 'http://localhost:5551'],
]);

export enum MirrorNodeKeyType {
  ECDSA_SECP256K1 = 'ECDSA_SECP256K1',
  ED25519 = 'ED25519',
}

export interface AccountAPIBalance {
  balance: number;
  timestamp: string;
}

export interface AccountAPIKey {
  _type: MirrorNodeKeyType;
  key: string;
}

export interface AccountAPIResponse {
  account: string;
  alias?: string | null;
  balance: AccountAPIBalance;
  created_timestamp: string;
  evm_address?: string;
  key?: AccountAPIKey;
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

export interface TokenBalanceInfo {
  token_id: string;
  balance: number;
  decimals?: number;
}

export interface TokenBalancesResponse {
  tokens: TokenBalanceInfo[];
  links?: {
    next?: string | null;
  };
}

export type MirrorNodeKey = {
  _type: string;
  key: string;
};

export interface TokenInfo {
  token_id: string;
  symbol: string;
  name: string;
  decimals: string;
  total_supply: string;
  max_supply: string;
  type: string;
  treasury_account_id: string;
  admin_key?: MirrorNodeKey | null;
  kyc_key?: MirrorNodeKey | null;
  freeze_key?: MirrorNodeKey | null;
  wipe_key?: MirrorNodeKey | null;
  supply_key?: MirrorNodeKey | null;
  fee_schedule_key?: MirrorNodeKey | null;
  metadata_key?: MirrorNodeKey | null;
  pause_key?: MirrorNodeKey | null;
  created_timestamp: string;
  deleted?: boolean | null;
  freeze_default?: boolean;
  auto_renew_account?: string;
  auto_renew_period?: number;
  expiry_timestamp?: number;
  pause_status: string;
  memo: string;
}

// Topic Info
export interface TopicInfo {
  topic_id: string;
  admin_key?: MirrorNodeKey | null;
  submit_key?: MirrorNodeKey | null;
  memo: string;
  running_hash?: string;
  sequence_number?: number;
  consensus_timestamp?: string;
  auto_renew_account?: string;
  auto_renew_period: number;
  expiration_timestamp?: string;
  created_timestamp: string;
  deleted: boolean;
}

// Topic Messages
export interface TopicMessageChunkInfo {
  initial_transaction_id: string | Record<string, unknown>;
  number: number;
  total: number;
}

export interface TopicMessage {
  consensus_timestamp: string;
  topic_id: string;
  message: string;
  running_hash: string;
  sequence_number: number;
  chunk_info?: TopicMessageChunkInfo;
}

export interface TopicMessagesAPIResponse {
  messages: TopicMessage[];
  links?: {
    next?: string | null;
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
export interface TransactionTransferItem {
  account: string;
  amount: number;
  is_approval?: boolean;
}

export interface TransactionTokenTransferItem {
  token_id: string;
  account: string;
  amount: number;
  is_approval?: boolean;
}

export interface TransactionNftTransferItem {
  is_approval: boolean;
  receiver_account_id: string;
  sender_account_id: string;
  serial_number: number;
  token_id: string;
}

export interface TransactionAssessedCustomFeeItem {
  amount: number;
  collector_account_id: string;
  token_id?: string | null;
  effective_payer_account_ids?: string[];
}

export interface TransactionDetailItem {
  transaction_id: string;
  consensus_timestamp: string;
  valid_start_timestamp: string;
  charged_tx_fee: number;
  memo_base64?: string | null;
  result: string;
  transaction_hash: string;
  name: string;
  node: string;
  scheduled: boolean;
  transfers: TransactionTransferItem[];
  token_transfers?: TransactionTokenTransferItem[];
  nft_transfers?: TransactionNftTransferItem[];
  assessed_custom_fees?: TransactionAssessedCustomFeeItem[];
}

export interface TransactionDetailsResponse {
  transactions: TransactionDetailItem[];
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
export interface TokenAirdropItem {
  account_id: string;
  amount: number;
  token_id: string;
  timestamp: string;
}

export interface TokenAirdropsResponse {
  airdrops: TokenAirdropItem[];
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
  account_id: string | null;
  created_timestamp: string;
  delegating_spender?: string | null;
  deleted: boolean;
  metadata?: string;
  modified_timestamp: string;
  serial_number: number;
  spender?: string | null;
  token_id: string;
}

export interface Filter {
  field: string;
  operation: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne';
  value: number | string;
}

// Get Accounts (list endpoint)
export enum AccountBalanceOperator {
  EQ = 'eq',
  GTE = 'gte',
  GT = ' gt',
  LTE = 'lte',
  LT = 'lt',
  NE = 'ne',
}

export interface AccountBalanceFilter {
  operator: AccountBalanceOperator;
  value: number;
}

export interface GetAccountsQueryParams {
  accountBalance?: AccountBalanceFilter;
  accountId?: string;
  accountPublicKey?: string;
  balance?: boolean;
  limit?: number;
  order?: MirrorNodeRequestOrderParameter;
}

export interface AccountListItemTokenBalance {
  token_id: string;
  balance: number;
}

export interface AccountListItemBalance {
  timestamp: string;
  balance: number;
  tokens?: AccountListItemTokenBalance[];
}

export interface AccountListItemAPIResponse {
  account: string;
  alias?: string | null;
  balance?: AccountListItemBalance;
  created_timestamp: string;
  evm_address?: string;
  key?: AccountAPIKey | null;
  deleted?: boolean;
  memo?: string;
}

export interface GetAccountsAPIResponse {
  accounts: AccountListItemAPIResponse[];
  links?: {
    next?: string | null;
  };
}

export interface AccountListItemDto {
  accountId: string;
  alias?: string;
  balance?: {
    timestamp: string;
    balance: number;
    tokens?: Array<{
      tokenId: string;
      balance: number;
    }>;
  };
  createdTimestamp: string;
  evmAddress?: string;
  accountPublicKey?: string;
  keyAlgorithm?: KeyAlgorithm;
  deleted?: boolean;
  memo?: string;
}

export interface GetAccountsResponse {
  accounts: AccountListItemDto[];
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

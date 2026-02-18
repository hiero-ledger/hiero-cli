/**
 * Mock factory functions for HederaMirrornodeService tests
 */
import type {
  AccountAPIResponse,
  AccountListItemAPIResponse,
  ContractInfo,
  ExchangeRateResponse,
  GetAccountsAPIResponse,
  NftInfo,
  TokenAirdropsResponse,
  TokenBalancesResponse,
  TokenInfo,
  TopicInfo,
  TopicMessage,
  TopicMessagesAPIResponse,
  TransactionDetailsResponse,
} from '@/core/services/mirrornode/types';

export const createMockAccountAPIResponse = (
  overrides: Partial<AccountAPIResponse> = {},
): AccountAPIResponse => ({
  account: '0.0.1234',
  balance: {
    balance: 1000000,
    timestamp: '2024-01-01T12:00:00.000Z',
  },
  created_timestamp: '2024-01-01T12:00:00.000Z',
  evm_address: '0x1234567890123456789012345678901234567890',
  key: {
    _type: 'ED25519',
    key: 'ed25519_abcd1234',
  },
  max_automatic_token_associations: 0,
  memo: '',
  receiver_sig_required: false,
  ...overrides,
});

export const createMockAccountListItemAPIResponse = (
  overrides: Partial<AccountListItemAPIResponse> = {},
): AccountListItemAPIResponse => ({
  account: '0.0.1234',
  created_timestamp: '2024-01-01T12:00:00.000Z',
  balance: {
    timestamp: '2024-01-01T12:00:00.000Z',
    balance: 1000000,
    tokens: [{ token_id: '0.0.2000', balance: 100 }],
  },
  evm_address: '0x1234567890123456789012345678901234567890',
  key: {
    _type: 'ED25519',
    key: 'ed25519_abcd1234',
  },
  memo: 'test memo',
  ...overrides,
});

export const createMockGetAccountsAPIResponse = (
  accounts: AccountListItemAPIResponse[] = [],
  overrides: Partial<GetAccountsAPIResponse> = {},
): GetAccountsAPIResponse => ({
  accounts,
  links: undefined,
  ...overrides,
});

export const createMockTokenBalancesResponse = (
  overrides: Partial<TokenBalancesResponse> = {},
): TokenBalancesResponse => ({
  account: '0.0.1234',
  balance: 0,
  tokens: [
    {
      token_id: '0.0.2000',
      balance: 100,
      decimals: 6,
    },
  ],
  timestamp: '2024-01-01T12:00:00.000Z',
  ...overrides,
});

export const createMockTopicMessage = (
  overrides: Partial<TopicMessage> = {},
): TopicMessage => ({
  consensus_timestamp: '2024-01-01T12:00:00.000Z',
  topic_id: '0.0.3000',
  message: 'test message',
  running_hash: 'abcd1234',
  sequence_number: 1,
  ...overrides,
});

export const createMockTopicMessagesAPIResponse = (
  messages: TopicMessage[] = [],
  overrides: Partial<TopicMessagesAPIResponse> = {},
): TopicMessagesAPIResponse => ({
  messages,
  links: undefined,
  ...overrides,
});

export const createMockTokenInfo = (
  overrides: Partial<TokenInfo> = {},
): TokenInfo => ({
  token_id: '0.0.2000',
  symbol: 'TEST',
  name: 'Test Token',
  decimals: '6',
  total_supply: '1000000000',
  max_supply: '1000000000',
  type: 'NON_FUNGIBLE_UNIQUE',
  treasury: '0.0.1234',
  created_timestamp: '2024-01-01T12:00:00.000Z',
  deleted: false,
  default_freeze_status: false,
  default_kyc_status: false,
  pause_status: 'UNPAUSED',
  memo: '',
  ...overrides,
});

export const createMockTopicInfo = (
  overrides: Partial<TopicInfo> = {},
): TopicInfo => ({
  topic_id: '0.0.3000',
  memo: 'test topic',
  running_hash: 'hash123',
  sequence_number: 1,
  consensus_timestamp: '2024-01-01T12:00:00.000Z',
  auto_renew_period: 7776000,
  created_timestamp: '2024-01-01T12:00:00.000Z',
  deleted: false,
  ...overrides,
});

export const createMockTransactionDetailsResponse = (
  overrides: Partial<TransactionDetailsResponse> = {},
): TransactionDetailsResponse => ({
  transactions: [
    {
      transaction_id: '0.0.1234-1700000000-000000000',
      consensus_timestamp: '2024-01-01T12:00:00.000Z',
      valid_start_timestamp: '2024-01-01T12:00:00.000Z',
      charged_tx_fee: 100000,
      result: 'SUCCESS',
      transaction_hash: 'hash123',
      name: 'CRYPTOTRANSFER',
      node: '0.0.3',
      transaction_fee: 100000,
      scheduled: false,
      transfers: [
        { account: '0.0.1234', amount: -1000000 },
        { account: '0.0.5678', amount: 1000000 },
      ],
    },
  ],
  ...overrides,
});

export const createMockContractInfo = (
  overrides: Partial<ContractInfo> = {},
): ContractInfo => ({
  contract_id: '0.0.4000',
  account: '0.0.1234',
  created_timestamp: '2024-01-01T12:00:00.000Z',
  deleted: false,
  memo: 'test contract',
  evm_address: '0x1234567890123456789012345678901234567890',
  auto_renew_period: 7776000,
  max_automatic_token_associations: 0,
  ...overrides,
});

export const createMockTokenAirdropsResponse = (
  overrides: Partial<TokenAirdropsResponse> = {},
): TokenAirdropsResponse => ({
  airdrops: [
    {
      account_id: '0.0.1234',
      amount: 1000,
      token_id: '0.0.2000',
      timestamp: '2024-01-01T12:00:00.000Z',
    },
  ],
  ...overrides,
});

export const createMockExchangeRateResponse = (
  overrides: Partial<ExchangeRateResponse> = {},
): ExchangeRateResponse => ({
  current_rate: {
    cent_equivalent: 12,
    expiration_time: '2024-01-01T12:00:00.000Z',
    hbar_equivalent: 1,
  },
  next_rate: {
    cent_equivalent: 12,
    expiration_time: '2024-01-01T12:00:00.000Z',
    hbar_equivalent: 1,
  },
  timestamp: '2024-01-01T12:00:00.000Z',
  ...overrides,
});

export const createMockNftInfo = (
  overrides: Partial<NftInfo> = {},
): NftInfo => ({
  account_id: '0.0.1234',
  created_timestamp: '2024-01-01T12:00:00.000Z',
  deleted: false,
  metadata: 'VGhpcyBpcyBhIHRlc3QgTkZU',
  modified_timestamp: '2024-01-01T12:00:00.000Z',
  serial_number: 1,
  token_id: '0.0.2000',
  ...overrides,
});

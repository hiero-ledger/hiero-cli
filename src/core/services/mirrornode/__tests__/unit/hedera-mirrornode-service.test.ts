/**
 * Unit tests for HederaMirrornodeServiceDefaultImpl
 * Tests all public methods with success paths, error paths, and edge cases
 */

import { HederaMirrornodeServiceDefaultImpl } from '@/core/services/mirrornode/hedera-mirrornode-service';

import {
  createMockAccountAPIResponse,
  createMockContractInfo,
  createMockExchangeRateResponse,
  createMockTokenAirdropsResponse,
  createMockTokenBalancesResponse,
  createMockTokenInfo,
  createMockTopicInfo,
  createMockTopicMessage,
  createMockTopicMessagesAPIResponse,
  createMockTransactionDetailsResponse,
} from './mocks';

// Mock fetch globally
global.fetch = jest.fn();

// Mock @hashgraph/sdk
jest.mock('@hashgraph/sdk');

// Test constants
const TEST_ACCOUNT_ID = '0.0.1234';
const TEST_TOKEN_ID = '0.0.2000';
const TEST_TOPIC_ID = '0.0.3000';
const TEST_CONTRACT_ID = '0.0.4000';
const TEST_TX_ID = '0.0.1234-1700000000-000000000';

// Network URLs
const TESTNET_URL = 'https://testnet.mirrornode.hedera.com/api/v1';
const MAINNET_URL = 'https://mainnet-public.mirrornode.hedera.com/api/v1';

// Timestamps & Values
const TEST_TIMESTAMP = '2024-01-01T12:00:00.000Z';
const TEST_SEQUENCE_NUMBER = 1;

// Setup helper
const setupService = (
  network: 'mainnet' | 'testnet' | 'previewnet' | 'localnet' = 'testnet',
) => {
  jest.clearAllMocks();

  const service = new HederaMirrornodeServiceDefaultImpl(network);

  return { service, network };
};

describe('HederaMirrornodeServiceDefaultImpl', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with testnet LedgerId', () => {
      const { service } = setupService('testnet');
      expect(service).toBeDefined();
    });

    it('should initialize with mainnet LedgerId', () => {
      const { service } = setupService('mainnet');
      expect(service).toBeDefined();
    });

    it('should initialize with previewnet LedgerId', () => {
      const { service } = setupService('previewnet');
      expect(service).toBeDefined();
    });
  });

  describe('getAccount', () => {
    it('should fetch account successfully', async () => {
      const { service } = setupService('testnet');
      const mockResponse = createMockAccountAPIResponse();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.getAccount(TEST_ACCOUNT_ID);

      expect(global.fetch).toHaveBeenCalledWith(
        `${TESTNET_URL}/accounts/${TEST_ACCOUNT_ID}`,
      );
      expect(result.accountId).toBe(TEST_ACCOUNT_ID);
      expect(result.balance.balance).toBe(mockResponse.balance.balance);
      expect(result.accountPublicKey).toBe('ed25519_abcd1234');
      expect(result.evmAddress).toBe(
        '0x1234567890123456789012345678901234567890',
      );
    });

    it('should construct correct URL for different networks', async () => {
      const { service } = setupService('mainnet');
      const mockResponse = createMockAccountAPIResponse();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      await service.getAccount(TEST_ACCOUNT_ID);

      expect(global.fetch).toHaveBeenCalledWith(
        `${MAINNET_URL}/accounts/${TEST_ACCOUNT_ID}`,
      );
    });

    it('should throw error when response has no key field', async () => {
      const { service } = setupService();
      const mockResponse = createMockAccountAPIResponse({ key: undefined });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      await expect(service.getAccount(TEST_ACCOUNT_ID)).rejects.toThrow(
        'No key is associated with the specified account.',
      );
    });

    it('should handle response without optional evm_address field', async () => {
      const { service } = setupService();
      const mockResponse = createMockAccountAPIResponse({
        evm_address: undefined,
      });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.getAccount(TEST_ACCOUNT_ID);

      expect(result.evmAddress).toBeUndefined();
    });

    it('should throw error on HTTP 404', async () => {
      const { service } = setupService();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(service.getAccount(TEST_ACCOUNT_ID)).rejects.toThrow(
        `Failed to fetch account ${TEST_ACCOUNT_ID}: 404 Not Found`,
      );
    });

    it('should throw error on HTTP 500', async () => {
      const { service } = setupService();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.getAccount(TEST_ACCOUNT_ID)).rejects.toThrow(
        `Failed to fetch account ${TEST_ACCOUNT_ID}: 500 Internal Server Error`,
      );
    });

    it('should throw error when account field is missing', async () => {
      const { service } = setupService();
      const mockResponse = createMockAccountAPIResponse({ account: '' as any });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      await expect(service.getAccount(TEST_ACCOUNT_ID)).rejects.toThrow(
        `Account ${TEST_ACCOUNT_ID} not found`,
      );
    });
  });

  describe('getAccountHBarBalance', () => {
    it('should fetch and convert balance to BigInt', async () => {
      const { service } = setupService();
      const mockResponse = createMockAccountAPIResponse({
        balance: { balance: 1000000000, timestamp: TEST_TIMESTAMP },
      });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.getAccountHBarBalance(TEST_ACCOUNT_ID);

      expect(result).toBe(1000000000n);
    });

    it('should handle large balance values', async () => {
      const { service } = setupService();
      const largeBalance = 9007199254740991; // 2^53 - 1
      const mockResponse = createMockAccountAPIResponse({
        balance: { balance: largeBalance, timestamp: TEST_TIMESTAMP },
      });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.getAccountHBarBalance(TEST_ACCOUNT_ID);

      expect(result).toBe(BigInt(largeBalance));
    });

    it('should handle zero balance', async () => {
      const { service } = setupService();
      const mockResponse = createMockAccountAPIResponse({
        balance: { balance: 0, timestamp: TEST_TIMESTAMP },
      });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.getAccountHBarBalance(TEST_ACCOUNT_ID);

      expect(result).toBe(0n);
    });

    it('should throw error with formatError wrapper when getAccount fails', async () => {
      const { service } = setupService();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        service.getAccountHBarBalance(TEST_ACCOUNT_ID),
      ).rejects.toThrow(
        `Failed to fetch hbar balance for ${TEST_ACCOUNT_ID}: : Failed to fetch account ${TEST_ACCOUNT_ID}: 404 Not Found`,
      );
    });
  });

  describe('getAccountTokenBalances', () => {
    it('should fetch token balances without tokenId filter', async () => {
      const { service } = setupService();
      const mockResponse = createMockTokenBalancesResponse();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.getAccountTokenBalances(TEST_ACCOUNT_ID);

      expect(global.fetch).toHaveBeenCalledWith(
        `${TESTNET_URL}/accounts/${TEST_ACCOUNT_ID}/tokens?`,
      );
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].token_id).toBe(TEST_TOKEN_ID);
    });

    it('should fetch token balances with tokenId filter', async () => {
      const { service } = setupService();
      const mockResponse = createMockTokenBalancesResponse();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      await service.getAccountTokenBalances(TEST_ACCOUNT_ID, TEST_TOKEN_ID);

      expect(global.fetch).toHaveBeenCalledWith(
        `${TESTNET_URL}/accounts/${TEST_ACCOUNT_ID}/tokens?&token.id=${TEST_TOKEN_ID}`,
      );
    });

    it('should handle empty tokens array', async () => {
      const { service } = setupService();
      const mockResponse = createMockTokenBalancesResponse({ tokens: [] });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.getAccountTokenBalances(TEST_ACCOUNT_ID);

      expect(result.tokens).toHaveLength(0);
    });

    it('should throw error on HTTP 404', async () => {
      const { service } = setupService();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        service.getAccountTokenBalances(TEST_ACCOUNT_ID),
      ).rejects.toThrow(
        `Failed to fetch balance for an account ${TEST_ACCOUNT_ID}: 404 Not Found`,
      );
    });
  });

  describe('getTopicMessage', () => {
    it('should fetch single message with correct URL', async () => {
      const { service } = setupService();
      const mockMessage = createMockTopicMessage();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockMessage),
      });

      const result = await service.getTopicMessage({
        topicId: TEST_TOPIC_ID,
        sequenceNumber: TEST_SEQUENCE_NUMBER,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${TESTNET_URL}/topics/${TEST_TOPIC_ID}/messages/${TEST_SEQUENCE_NUMBER}`,
      );
      expect(result.topic_id).toBe(TEST_TOPIC_ID);
      expect(result.sequence_number).toBe(TEST_SEQUENCE_NUMBER);
    });
  });

  describe('getTopicMessages', () => {
    it('should fetch messages without filter', async () => {
      const { service } = setupService();
      const mockMessages = [createMockTopicMessage()];
      const mockResponse = createMockTopicMessagesAPIResponse(mockMessages);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.getTopicMessages({ topicId: TEST_TOPIC_ID });

      expect(global.fetch).toHaveBeenCalledWith(
        `${TESTNET_URL}/topics/${TEST_TOPIC_ID}/messages?order=desc&limit=100`,
      );
      expect(result.messages).toHaveLength(1);
      expect(result.topicId).toBe(TEST_TOPIC_ID);
    });

    it('should fetch messages with filter', async () => {
      const { service } = setupService();
      const mockMessages = [createMockTopicMessage()];
      const mockResponse = createMockTopicMessagesAPIResponse(mockMessages);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      await service.getTopicMessages({
        topicId: TEST_TOPIC_ID,
        filters: [{ field: 'sequenceNumber', operation: 'gt', value: 10 }],
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${TESTNET_URL}/topics/${TEST_TOPIC_ID}/messages?sequenceNumber=gt:10&order=desc&limit=100`,
      );
    });

    it('should handle single page response (no links.next)', async () => {
      const { service } = setupService();
      const mockMessages = [createMockTopicMessage()];
      const mockResponse = createMockTopicMessagesAPIResponse(mockMessages, {
        links: undefined,
      });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.getTopicMessages({ topicId: TEST_TOPIC_ID });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.messages).toHaveLength(1);
    });

    it('should handle pagination with links.next', async () => {
      const { service } = setupService();
      const msgs1 = [createMockTopicMessage({ sequence_number: 1 })];
      const msgs2 = [createMockTopicMessage({ sequence_number: 2 })];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            messages: msgs1,
            links: { next: '/topics/0.0.3000/messages?timestamp=lt:123' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            messages: msgs2,
            links: undefined,
          }),
        });

      const result = await service.getTopicMessages({ topicId: TEST_TOPIC_ID });

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].sequence_number).toBe(1);
      expect(result.messages[1].sequence_number).toBe(2);
    });

    it('should stop pagination at 100 pages', async () => {
      const { service } = setupService();

      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue({
            messages: [createMockTopicMessage()],
            links: { next: '/topics/0.0.3000/messages?next=page' },
          }),
        }),
      );

      const result = await service.getTopicMessages({ topicId: TEST_TOPIC_ID });

      expect(global.fetch).toHaveBeenCalledTimes(100);
      expect(result.messages).toHaveLength(100);
    });

    it('should construct next URL correctly: baseUrl + links.next', async () => {
      const { service } = setupService();
      const nextPath = '/topics/0.0.3000/messages?timestamp=lt:123';

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            messages: [createMockTopicMessage()],
            links: { next: nextPath },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            messages: [createMockTopicMessage()],
            links: undefined,
          }),
        });

      await service.getTopicMessages({ topicId: TEST_TOPIC_ID });

      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        `${TESTNET_URL}${nextPath}`,
      );
    });

    it('should throw error on HTTP 404', async () => {
      const { service } = setupService();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        service.getTopicMessages({ topicId: TEST_TOPIC_ID }),
      ).rejects.toThrow(
        `Failed to get topic messages for ${TEST_TOPIC_ID}: 404 Not Found`,
      );
    });

    it('should log error to console.error before rethrowing', async () => {
      const { service } = setupService();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(
        service.getTopicMessages({ topicId: TEST_TOPIC_ID }),
      ).rejects.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(
          `Failed to fetch topic messages for ${TEST_TOPIC_ID}`,
        ),
        expect.any(Error),
      );
    });

    it('should handle empty messages array', async () => {
      const { service } = setupService();
      const mockResponse = createMockTopicMessagesAPIResponse([]);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.getTopicMessages({ topicId: TEST_TOPIC_ID });

      expect(result.messages).toHaveLength(0);
    });
  });

  describe('getTokenInfo', () => {
    it('should fetch token info with correct URL', async () => {
      const { service } = setupService();
      const mockTokenInfo = createMockTokenInfo();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenInfo),
      });

      const result = await service.getTokenInfo(TEST_TOKEN_ID);

      expect(global.fetch).toHaveBeenCalledWith(
        `${TESTNET_URL}/tokens/${TEST_TOKEN_ID}`,
      );
      expect(result.token_id).toBe(TEST_TOKEN_ID);
      expect(result.symbol).toBe('TEST');
    });

    it('should throw error on HTTP 404', async () => {
      const { service } = setupService();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(service.getTokenInfo(TEST_TOKEN_ID)).rejects.toThrow(
        `Failed to get token info for a token ${TEST_TOKEN_ID}: 404 Not Found`,
      );
    });
  });

  describe('getTopicInfo', () => {
    it('should fetch topic info with correct URL', async () => {
      const { service } = setupService();
      const mockTopicInfo = createMockTopicInfo();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTopicInfo),
      });

      const result = await service.getTopicInfo(TEST_TOPIC_ID);

      expect(global.fetch).toHaveBeenCalledWith(
        `${TESTNET_URL}/topics/${TEST_TOPIC_ID}`,
      );
      expect(result.topic_id).toBe(TEST_TOPIC_ID);
    });

    it('should throw error on HTTP 404', async () => {
      const { service } = setupService();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(service.getTopicInfo(TEST_TOPIC_ID)).rejects.toThrow(
        `Failed to get topic info for ${TEST_TOPIC_ID}: 404 Not Found`,
      );
    });
  });

  describe('getTransactionRecord', () => {
    it('should fetch transaction without nonce', async () => {
      const { service } = setupService();
      const mockTxResponse = createMockTransactionDetailsResponse();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTxResponse),
      });

      const result = await service.getTransactionRecord(TEST_TX_ID);

      expect(global.fetch).toHaveBeenCalledWith(
        `${TESTNET_URL}/transactions/${TEST_TX_ID}`,
      );
      expect(result.transactions[0].transaction_id).toBe(TEST_TX_ID);
    });

    it('should fetch transaction with nonce parameter', async () => {
      const { service } = setupService();
      const mockTxResponse = createMockTransactionDetailsResponse();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTxResponse),
      });

      await service.getTransactionRecord(TEST_TX_ID, 1);

      expect(global.fetch).toHaveBeenCalledWith(
        `${TESTNET_URL}/transactions/${TEST_TX_ID}?nonce=1`,
      );
    });

    it('should handle nonce = 0 (falsy but valid)', async () => {
      const { service } = setupService();
      const mockTxResponse = createMockTransactionDetailsResponse();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTxResponse),
      });

      await service.getTransactionRecord(TEST_TX_ID, 0);

      expect(global.fetch).toHaveBeenCalledWith(
        `${TESTNET_URL}/transactions/${TEST_TX_ID}?nonce=0`,
      );
    });

    it('should throw error on HTTP 404', async () => {
      const { service } = setupService();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(service.getTransactionRecord(TEST_TX_ID)).rejects.toThrow(
        `Failed to get transaction record for ${TEST_TX_ID}: 404 Not Found`,
      );
    });
  });

  describe('getContractInfo', () => {
    it('should fetch contract info with correct URL', async () => {
      const { service } = setupService();
      const mockContractInfo = createMockContractInfo();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockContractInfo),
      });

      const result = await service.getContractInfo(TEST_CONTRACT_ID);

      expect(global.fetch).toHaveBeenCalledWith(
        `${TESTNET_URL}/contracts/${TEST_CONTRACT_ID}`,
      );
      expect(result.contract_id).toBe(TEST_CONTRACT_ID);
    });

    it('should throw error on HTTP 404', async () => {
      const { service } = setupService();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(service.getContractInfo(TEST_CONTRACT_ID)).rejects.toThrow(
        `Failed to get contract info for ${TEST_CONTRACT_ID}: 404 Not Found`,
      );
    });
  });

  describe('getPendingAirdrops', () => {
    it('should fetch pending airdrops with correct URL', async () => {
      const { service } = setupService();
      const mockAirdrops = createMockTokenAirdropsResponse();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockAirdrops),
      });

      const result = await service.getPendingAirdrops(TEST_ACCOUNT_ID);

      expect(global.fetch).toHaveBeenCalledWith(
        `${TESTNET_URL}/accounts/${TEST_ACCOUNT_ID}/airdrops/pending`,
      );
      expect(result.airdrops).toHaveLength(1);
    });

    it('should handle empty airdrops array', async () => {
      const { service } = setupService();
      const mockAirdrops = createMockTokenAirdropsResponse({ airdrops: [] });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockAirdrops),
      });

      const result = await service.getPendingAirdrops(TEST_ACCOUNT_ID);

      expect(result.airdrops).toHaveLength(0);
    });

    it('should throw error on HTTP 404', async () => {
      const { service } = setupService();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(service.getPendingAirdrops(TEST_ACCOUNT_ID)).rejects.toThrow(
        `Failed to fetch pending airdrops for an account ${TEST_ACCOUNT_ID}: 404 Not Found`,
      );
    });
  });

  describe('getOutstandingAirdrops', () => {
    it('should fetch outstanding airdrops with correct URL', async () => {
      const { service } = setupService();
      const mockAirdrops = createMockTokenAirdropsResponse();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockAirdrops),
      });

      const result = await service.getOutstandingAirdrops(TEST_ACCOUNT_ID);

      expect(global.fetch).toHaveBeenCalledWith(
        `${TESTNET_URL}/accounts/${TEST_ACCOUNT_ID}/airdrops/outstanding`,
      );
      expect(result.airdrops).toHaveLength(1);
    });

    it('should handle empty airdrops array', async () => {
      const { service } = setupService();
      const mockAirdrops = createMockTokenAirdropsResponse({ airdrops: [] });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockAirdrops),
      });

      const result = await service.getOutstandingAirdrops(TEST_ACCOUNT_ID);

      expect(result.airdrops).toHaveLength(0);
    });

    it('should throw error on HTTP 404', async () => {
      const { service } = setupService();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        service.getOutstandingAirdrops(TEST_ACCOUNT_ID),
      ).rejects.toThrow(
        `Failed to fetch outstanding airdrops for an account ${TEST_ACCOUNT_ID}: 404 Not Found`,
      );
    });
  });

  describe('getExchangeRate', () => {
    it('should fetch exchange rate without timestamp', async () => {
      const { service } = setupService();
      const mockExchangeRate = createMockExchangeRateResponse();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockExchangeRate),
      });

      const result = await service.getExchangeRate();

      expect(global.fetch).toHaveBeenCalledWith(
        `${TESTNET_URL}/network/exchangerate`,
      );
      expect(result.current_rate.hbar_equivalent).toBe(1);
    });

    it('should fetch exchange rate with timestamp', async () => {
      const { service } = setupService();
      const mockExchangeRate = createMockExchangeRateResponse();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockExchangeRate),
      });

      await service.getExchangeRate(TEST_TIMESTAMP);

      expect(global.fetch).toHaveBeenCalledWith(
        `${TESTNET_URL}/network/exchangerate?timestamp=${encodeURIComponent(TEST_TIMESTAMP)}`,
      );
    });

    it('should encode timestamp with encodeURIComponent', async () => {
      const { service } = setupService();
      const timestampWithSpecialChars = '2024-01-01T12:00:00+00:00';
      const mockExchangeRate = createMockExchangeRateResponse();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockExchangeRate),
      });

      await service.getExchangeRate(timestampWithSpecialChars);

      expect(global.fetch).toHaveBeenCalledWith(
        `${TESTNET_URL}/network/exchangerate?timestamp=${encodeURIComponent(timestampWithSpecialChars)}`,
      );
    });

    it('should throw error on HTTP 404', async () => {
      const { service } = setupService();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(service.getExchangeRate()).rejects.toThrow(
        'HTTP error! status: 404. Message: Not Found',
      );
    });
  });
});

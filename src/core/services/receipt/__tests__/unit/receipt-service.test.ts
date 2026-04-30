import { Status } from '@hiero-ledger/sdk';

import {
  createMockClient,
  createMockTransactionReceipt,
} from '@/__tests__/mocks/hedera-sdk-mocks';
import { makeLogger, makeNetworkMock } from '@/__tests__/mocks/mocks';
import { ReceiptServiceImpl } from '@/core/services/receipt/receipt-service';
import { SupportedNetwork } from '@/core/types/shared.types';

const MOCK_TX_ID = '0.0.1234@1234567890.000';
const MOCK_ACCOUNT_ID = '0.0.5555';
const MOCK_TOKEN_ID = '0.0.6666';
const MOCK_TOPIC_ID = '0.0.7777';
const MOCK_CONTRACT_ID = '0.0.9999';
const MOCK_TOPIC_SEQ = 42;
const NETWORK = SupportedNetwork.TESTNET;

const mockExecute = jest.fn();
const mockSetTransactionId = jest.fn().mockReturnThis();
const mockCreateClient = jest.fn();

jest.mock('@/core/utils/client-init', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

jest.mock('@hiero-ledger/sdk', () => {
  const actual = jest.requireActual('@hiero-ledger/sdk');
  return {
    ...actual,
    TransactionId: {
      fromString: jest.fn((id: string) => ({ toString: () => id })),
    },
    TransactionReceiptQuery: jest.fn().mockImplementation(() => ({
      setTransactionId: mockSetTransactionId,
      execute: mockExecute,
    })),
  };
});

const setupService = () => {
  const logger = makeLogger();
  const networkService = makeNetworkMock(NETWORK);
  const mockClient = createMockClient();

  mockCreateClient.mockReturnValue(mockClient);

  const service = new ReceiptServiceImpl(logger, networkService);
  return { service, logger, networkService, mockClient };
};

describe('ReceiptServiceImpl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getReceipt', () => {
    it('should fetch receipt and return TransactionResult (happy path)', async () => {
      const { service, logger } = setupService();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
      });

      mockExecute.mockResolvedValue(mockReceipt);

      const result = await service.getReceipt({
        transactionId: MOCK_TX_ID,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        `[RECEIPT] Fetching receipt for transaction: ${MOCK_TX_ID}`,
      );
      expect(mockSetTransactionId).toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalled();
      expect(result.transactionId).toBe(MOCK_TX_ID);
      expect(result.success).toBe(true);
      expect(result.receipt.status.status).toBe('success');
    });

    it('should return result with accountId when present', async () => {
      const { service } = setupService();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
        accountId: { toString: jest.fn().mockReturnValue(MOCK_ACCOUNT_ID) },
      });

      mockExecute.mockResolvedValue(mockReceipt);

      const result = await service.getReceipt({
        transactionId: MOCK_TX_ID,
      });

      expect(result.accountId).toBe(MOCK_ACCOUNT_ID);
    });

    it('should return result with tokenId when present', async () => {
      const { service } = setupService();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
        tokenId: { toString: jest.fn().mockReturnValue(MOCK_TOKEN_ID) },
      });

      mockExecute.mockResolvedValue(mockReceipt);

      const result = await service.getReceipt({
        transactionId: MOCK_TX_ID,
      });

      expect(result.tokenId).toBe(MOCK_TOKEN_ID);
    });

    it('should return result with topicId and topicSequenceNumber when present', async () => {
      const { service } = setupService();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
        topicId: { toString: jest.fn().mockReturnValue(MOCK_TOPIC_ID) },
        topicSequenceNumber: BigInt(MOCK_TOPIC_SEQ),
      });

      mockExecute.mockResolvedValue(mockReceipt);

      const result = await service.getReceipt({
        transactionId: MOCK_TX_ID,
      });

      expect(result.topicId).toBe(MOCK_TOPIC_ID);
      expect(result.topicSequenceNumber).toBe(MOCK_TOPIC_SEQ);
    });

    it('should return result with contractId and serials when present', async () => {
      const { service } = setupService();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
        contractId: { toString: jest.fn().mockReturnValue(MOCK_CONTRACT_ID) },
        serials: [{ toString: () => '1' }, { toString: () => '2' }],
      });

      mockExecute.mockResolvedValue(mockReceipt);

      const result = await service.getReceipt({
        transactionId: MOCK_TX_ID,
      });

      expect(result.contractId).toBe(MOCK_CONTRACT_ID);
      expect(result.receipt.serials).toEqual(['1', '2']);
    });

    it('should return success=false when status is not Success', async () => {
      const { service } = setupService();
      const mockReceipt = createMockTransactionReceipt({
        status: { _code: 1 },
      });

      mockExecute.mockResolvedValue(mockReceipt);

      const result = await service.getReceipt({
        transactionId: MOCK_TX_ID,
      });

      expect(result.success).toBe(false);
      expect(result.receipt.status.status).toBe('failed');
    });

    it('should call createClient with network and localnet config', async () => {
      const { service, networkService } = setupService();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
      });

      mockExecute.mockResolvedValue(mockReceipt);

      await service.getReceipt({ transactionId: MOCK_TX_ID });

      expect(mockCreateClient).toHaveBeenCalledWith(
        NETWORK,
        networkService.getLocalnetConfig(),
      );
    });

    it('should close client in finally block', async () => {
      const { service, mockClient } = setupService();

      mockExecute.mockRejectedValue(new Error('Receipt fetch failed'));

      await expect(
        service.getReceipt({ transactionId: MOCK_TX_ID }),
      ).rejects.toThrow('Receipt fetch failed');

      expect(mockClient.close).toHaveBeenCalled();
    });

    it('should close client when getReceipt succeeds', async () => {
      const { service, mockClient } = setupService();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
      });

      mockExecute.mockResolvedValue(mockReceipt);

      await service.getReceipt({ transactionId: MOCK_TX_ID });

      expect(mockClient.close).toHaveBeenCalled();
    });
  });
});

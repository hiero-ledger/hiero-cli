import type { Client, ContractCreateFlow } from '@hashgraph/sdk';

import { Status } from '@hashgraph/sdk';

import {
  createMockClient,
  createMockContractCreateFlow,
  createMockTransactionReceipt,
  createMockTransactionRecord,
  createMockTransactionResponse,
} from '@/__tests__/mocks/hedera-sdk-mocks';
import {
  makeKmsMock,
  makeLogger,
  makeNetworkMock,
} from '@/__tests__/mocks/mocks';
import { TransactionError } from '@/core/errors';
import { TxExecuteServiceImpl } from '@/core/services/tx-execute/tx-execute-service';

jest.mock('@hashgraph/sdk', () => {
  const actual = jest.requireActual('@hashgraph/sdk');
  const MockStatusSuccess = { _code: 22, toString: () => 'SUCCESS' };

  return {
    ...actual,
    Status: {
      Success: MockStatusSuccess,
    },
  };
});

const NonSuccessStatus = { _code: 1, toString: () => 'INVALID' };

const MOCK_TX_ID = '0.0.1234@1234567890.000';
const MOCK_CONSENSUS_TS = '2024-01-01T00:00:00.000Z';
const MOCK_ACCOUNT_ID = '0.0.5555';
const MOCK_TOKEN_ID = '0.0.6666';
const MOCK_TOPIC_ID = '0.0.7777';
const MOCK_TOPIC_SEQ = 42;
const NETWORK = 'testnet';

const setupService = () => {
  const logger = makeLogger();
  const kms = makeKmsMock();
  const networkService = makeNetworkMock(NETWORK);
  const mockClient = createMockClient();
  kms.createClient.mockReturnValue(mockClient as unknown as Client);

  const service = new TxExecuteServiceImpl(logger, kms, networkService);
  return { service, logger, kms, networkService, mockClient };
};

const makeMockTx = () => ({
  execute: jest.fn(),
  transactionId: { toString: jest.fn().mockReturnValue(MOCK_TX_ID) },
});

describe('TxExecuteServiceImpl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should execute transaction and return TransactionResult (happy path)', async () => {
      const { service, kms, mockClient } = setupService();
      const mockTx = makeMockTx();
      const mockResponse = createMockTransactionResponse();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
      });
      const mockRecord = createMockTransactionRecord();

      mockTx.execute.mockResolvedValue(mockResponse);
      mockResponse.getReceipt.mockResolvedValue(mockReceipt);
      mockResponse.getRecord.mockResolvedValue(mockRecord);

      const result = await service.execute(mockTx as never);

      expect(kms.createClient).toHaveBeenCalledWith(NETWORK);
      expect(mockTx.execute).toHaveBeenCalledWith(mockClient);
      expect(result.transactionId).toBe(MOCK_TX_ID);
      expect(result.success).toBe(true);
      expect(result.consensusTimestamp).toBe(MOCK_CONSENSUS_TS);
      expect(result.receipt.status.status).toBe('success');
    });

    it('should return result with accountId when present', async () => {
      const { service } = setupService();
      const mockTx = makeMockTx();
      const mockResponse = createMockTransactionResponse();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
        accountId: { toString: jest.fn().mockReturnValue(MOCK_ACCOUNT_ID) },
      });
      const mockRecord = createMockTransactionRecord();

      mockTx.execute.mockResolvedValue(mockResponse);
      mockResponse.getReceipt.mockResolvedValue(mockReceipt);
      mockResponse.getRecord.mockResolvedValue(mockRecord);

      const result = await service.execute(mockTx as never);

      expect(result.accountId).toBe(MOCK_ACCOUNT_ID);
    });

    it('should return result with tokenId when present', async () => {
      const { service } = setupService();
      const mockTx = makeMockTx();
      const mockResponse = createMockTransactionResponse();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
        tokenId: { toString: jest.fn().mockReturnValue(MOCK_TOKEN_ID) },
      });
      const mockRecord = createMockTransactionRecord();

      mockTx.execute.mockResolvedValue(mockResponse);
      mockResponse.getReceipt.mockResolvedValue(mockReceipt);
      mockResponse.getRecord.mockResolvedValue(mockRecord);

      const result = await service.execute(mockTx as never);

      expect(result.tokenId).toBe(MOCK_TOKEN_ID);
    });

    it('should return result with topicId and topicSequenceNumber when present', async () => {
      const { service } = setupService();
      const mockTx = makeMockTx();
      const mockResponse = createMockTransactionResponse();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
        topicId: { toString: jest.fn().mockReturnValue(MOCK_TOPIC_ID) },
        topicSequenceNumber: BigInt(MOCK_TOPIC_SEQ),
      });
      const mockRecord = createMockTransactionRecord();

      mockTx.execute.mockResolvedValue(mockResponse);
      mockResponse.getReceipt.mockResolvedValue(mockReceipt);
      mockResponse.getRecord.mockResolvedValue(mockRecord);

      const result = await service.execute(mockTx as never);

      expect(result.topicId).toBe(MOCK_TOPIC_ID);
      expect(result.topicSequenceNumber).toBe(MOCK_TOPIC_SEQ);
    });

    it('should return result with contractId and serials when present', async () => {
      const { service } = setupService();
      const mockTx = makeMockTx();
      const mockResponse = createMockTransactionResponse();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
        contractId: { toString: jest.fn().mockReturnValue('0.0.9999') },
        serials: [{ toString: () => '1' }, { toString: () => '2' }],
      });
      const mockRecord = createMockTransactionRecord();

      mockTx.execute.mockResolvedValue(mockResponse);
      mockResponse.getReceipt.mockResolvedValue(mockReceipt);
      mockResponse.getRecord.mockResolvedValue(mockRecord);

      const result = await service.execute(mockTx as never);

      expect(result.contractId).toBe('0.0.9999');
      expect(result.receipt.serials).toEqual(['1', '2']);
    });

    it('should return success=false when status is not Success', async () => {
      const { service } = setupService();
      const mockTx = makeMockTx();
      const mockResponse = createMockTransactionResponse();
      const mockReceipt = createMockTransactionReceipt({
        status: NonSuccessStatus,
      });
      const mockRecord = createMockTransactionRecord();

      mockTx.execute.mockResolvedValue(mockResponse);
      mockResponse.getReceipt.mockResolvedValue(mockReceipt);
      mockResponse.getRecord.mockResolvedValue(mockRecord);

      const result = await service.execute(mockTx as never);

      expect(result.success).toBe(false);
      expect(result.receipt.status.status).toBe('failed');
    });

    it('should throw TransactionError when execution fails', async () => {
      const { service } = setupService();
      const mockTx = makeMockTx();

      mockTx.execute.mockRejectedValue(new Error('Network error'));

      await expect(service.execute(mockTx as never)).rejects.toThrow(
        TransactionError,
      );
    });

    it('should throw TransactionError when getReceipt fails', async () => {
      const { service } = setupService();
      const mockTx = makeMockTx();
      const mockResponse = createMockTransactionResponse();

      mockTx.execute.mockResolvedValue(mockResponse);
      mockResponse.getReceipt.mockRejectedValue(new Error('Receipt error'));

      await expect(service.execute(mockTx as never)).rejects.toThrow(
        TransactionError,
      );
    });

    it('should close client in finally block', async () => {
      const { service, mockClient } = setupService();
      const mockTx = makeMockTx();

      mockTx.execute.mockRejectedValue(new Error('fail'));

      await expect(service.execute(mockTx as never)).rejects.toThrow();
      expect(mockClient.close).toHaveBeenCalled();
    });
  });

  describe('executeContractCreateFlow', () => {
    it('should execute contract create flow and return result', async () => {
      const { service, mockClient } = setupService();
      const mockFlow = createMockContractCreateFlow();
      const mockResponse = createMockTransactionResponse();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
        contractId: { toString: jest.fn().mockReturnValue('0.0.9999') },
      });
      const mockRecord = createMockTransactionRecord();

      mockFlow.execute.mockResolvedValue(mockResponse);
      mockResponse.getReceipt.mockResolvedValue(mockReceipt);
      mockResponse.getRecord.mockResolvedValue(mockRecord);

      const result = await service.executeContractCreateFlow(
        mockFlow as unknown as ContractCreateFlow,
      );

      expect(mockFlow.execute).toHaveBeenCalledWith(mockClient);
      expect(result.success).toBe(true);
      expect(result.contractId).toBe('0.0.9999');
    });

    it('should throw TransactionError when flow execution fails', async () => {
      const { service } = setupService();
      const mockFlow = createMockContractCreateFlow();

      mockFlow.execute.mockRejectedValue(new Error('Flow error'));

      await expect(
        service.executeContractCreateFlow(
          mockFlow as unknown as ContractCreateFlow,
        ),
      ).rejects.toThrow(TransactionError);
    });

    it('should close client in finally block', async () => {
      const { service, mockClient } = setupService();
      const mockFlow = createMockContractCreateFlow();

      mockFlow.execute.mockRejectedValue(new Error('fail'));

      await expect(
        service.executeContractCreateFlow(
          mockFlow as unknown as ContractCreateFlow,
        ),
      ).rejects.toThrow();
      expect(mockClient.close).toHaveBeenCalled();
    });
  });
});

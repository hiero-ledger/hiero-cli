/**
 * Unit tests for TxExecutionServiceImpl
 * Tests transaction signing, execution, and result parsing
 */
import type {
  Client,
  ContractCreateFlow,
  Transaction as HederaTransaction,
} from '@hashgraph/sdk';

import { Status } from '@hashgraph/sdk';

import {
  makeKmsMock,
  makeLogger,
  makeNetworkMock,
} from '@/__tests__/mocks/mocks';
import { TransactionError } from '@/core/errors';
import { TxExecutionServiceImpl } from '@/core/services/tx-execution/tx-execution-service';

import {
  createMockClient,
  createMockContractCreateFlow,
  createMockTransaction,
  createMockTransactionReceipt,
  createMockTransactionRecord,
  createMockTransactionResponse,
} from './mocks';
// Mock Status enum before imports
jest.mock('@hashgraph/sdk', () => {
  const actual = jest.requireActual('@hashgraph/sdk');
  const MockStatusSuccess = { _code: 22 };

  return {
    ...actual,
    Status: {
      Success: MockStatusSuccess,
    },
  };
});

// Mock status for testing non-Success case (not part of real SDK Status enum)
const NonSuccessStatus = { _code: 1 };

const MOCK_TX_ID = '0.0.1234@1234567890.000';
const MOCK_CONSENSUS_TS = '2024-01-01T00:00:00.000Z';
const MOCK_ACCOUNT_ID = '0.0.5555';
const MOCK_TOKEN_ID = '0.0.6666';
const MOCK_TOPIC_ID = '0.0.7777';
const MOCK_TOPIC_SEQ = 42;
const MOCK_KEY_REF_1 = 'kr_test1';
const MOCK_KEY_REF_2 = 'kr_test2';
const NETWORK = 'testnet';

const setupService = () => {
  const logger = makeLogger();
  const kms = makeKmsMock();
  const networkService = makeNetworkMock(NETWORK);

  const mockClient = createMockClient();
  kms.createClient.mockReturnValue(mockClient as unknown as Client);

  const service = new TxExecutionServiceImpl(logger, kms, networkService);

  return { service, logger, kms, networkService, mockClient };
};

describe('TxExecutionServiceImpl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signAndExecute', () => {
    it('should delegate to signAndExecuteWith with empty keyRefIds and log operator signing', async () => {
      const { service, logger, kms, mockClient } = setupService();
      const mockTx = createMockTransaction();
      const mockResponse = createMockTransactionResponse();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
      });
      const mockRecord = createMockTransactionRecord();

      mockTx.execute.mockResolvedValue(mockResponse);
      mockResponse.getReceipt.mockResolvedValue(mockReceipt);
      mockResponse.getRecord.mockResolvedValue(mockRecord);

      const result = await service.signAndExecute(
        mockTx as unknown as HederaTransaction,
      );

      expect(logger.debug).toHaveBeenCalledWith(
        '[TX-EXECUTION] Signing and executing transaction with operator',
      );
      expect(kms.signTransaction).not.toHaveBeenCalled();
      expect(mockTx.freezeWith).toHaveBeenCalledWith(mockClient);
      expect(mockTx.execute).toHaveBeenCalledWith(mockClient);
      expect(result.success).toBe(true);
    });
  });

  describe('signAndExecuteWith', () => {
    it('should freeze, execute, and return complete TransactionResult (happy path)', async () => {
      const { service, logger, kms, mockClient, networkService } =
        setupService();
      const mockTx = createMockTransaction();
      const mockResponse = createMockTransactionResponse();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
      });
      const mockRecord = createMockTransactionRecord();

      mockTx.execute.mockResolvedValue(mockResponse);
      mockResponse.getReceipt.mockResolvedValue(mockReceipt);
      mockResponse.getRecord.mockResolvedValue(mockRecord);

      const result = await service.signAndExecuteWith(
        mockTx as unknown as HederaTransaction,
        [],
      );

      expect(mockTx.isFrozen).toHaveBeenCalled();
      expect(mockTx.freezeWith).toHaveBeenCalledWith(mockClient);
      expect(networkService.getCurrentNetwork).toHaveBeenCalled();
      expect(kms.createClient).toHaveBeenCalledWith(NETWORK);
      expect(mockTx.execute).toHaveBeenCalledWith(mockClient);
      expect(mockResponse.getReceipt).toHaveBeenCalledWith(mockClient);
      expect(mockResponse.getRecord).toHaveBeenCalledWith(mockClient);

      expect(result.transactionId).toBe(MOCK_TX_ID);
      expect(result.success).toBe(true);
      expect(result.consensusTimestamp).toBe(MOCK_CONSENSUS_TS);
      expect(result.receipt.status.status).toBe('success');

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          '[TX-EXECUTION] Transaction executed successfully',
        ),
      );
    });

    it('should not freeze transaction when already frozen', async () => {
      const { service, mockClient } = setupService();
      const mockTx = createMockTransaction({
        isFrozen: jest.fn().mockReturnValue(true),
      });
      const mockResponse = createMockTransactionResponse();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
      });
      const mockRecord = createMockTransactionRecord();

      mockTx.execute.mockResolvedValue(mockResponse);
      mockResponse.getReceipt.mockResolvedValue(mockReceipt);
      mockResponse.getRecord.mockResolvedValue(mockRecord);

      const result = await service.signAndExecuteWith(
        mockTx as unknown as HederaTransaction,
        [],
      );

      expect(mockTx.isFrozen).toHaveBeenCalled();
      expect(mockTx.freezeWith).not.toHaveBeenCalled();
      expect(mockTx.execute).toHaveBeenCalledWith(mockClient);
      expect(result.success).toBe(true);
    });

    it('should sign with multiple keys in order', async () => {
      const { service, logger, kms } = setupService();
      const mockTx = createMockTransaction();
      const mockResponse = createMockTransactionResponse();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
      });
      const mockRecord = createMockTransactionRecord();

      mockTx.execute.mockResolvedValue(mockResponse);
      mockResponse.getReceipt.mockResolvedValue(mockReceipt);
      mockResponse.getRecord.mockResolvedValue(mockRecord);

      await service.signAndExecuteWith(mockTx as unknown as HederaTransaction, [
        MOCK_KEY_REF_1,
        MOCK_KEY_REF_2,
      ]);

      expect(logger.debug).toHaveBeenCalledWith(
        '[TX-EXECUTION] Signing with 2 key(s)',
      );
      expect(kms.signTransaction).toHaveBeenCalledTimes(2);
      expect(kms.signTransaction).toHaveBeenNthCalledWith(
        1,
        mockTx,
        MOCK_KEY_REF_1,
      );
      expect(kms.signTransaction).toHaveBeenNthCalledWith(
        2,
        mockTx,
        MOCK_KEY_REF_2,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        `[TX-EXECUTION] Signing with key: ${MOCK_KEY_REF_1}`,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        `[TX-EXECUTION] Signing with key: ${MOCK_KEY_REF_2}`,
      );
    });

    it('should deduplicate keyRefIds', async () => {
      const { service, kms } = setupService();
      const mockTx = createMockTransaction();
      const mockResponse = createMockTransactionResponse();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
      });
      const mockRecord = createMockTransactionRecord();

      mockTx.execute.mockResolvedValue(mockResponse);
      mockResponse.getReceipt.mockResolvedValue(mockReceipt);
      mockResponse.getRecord.mockResolvedValue(mockRecord);

      await service.signAndExecuteWith(mockTx as unknown as HederaTransaction, [
        MOCK_KEY_REF_1,
        MOCK_KEY_REF_2,
        MOCK_KEY_REF_1,
      ]);

      // Assert - should only call signTransaction 2 times, not 3
      expect(kms.signTransaction).toHaveBeenCalledTimes(2);
      expect(kms.signTransaction).toHaveBeenCalledWith(mockTx, MOCK_KEY_REF_1);
      expect(kms.signTransaction).toHaveBeenCalledWith(mockTx, MOCK_KEY_REF_2);
    });

    it('should return TransactionResult with accountId when present', async () => {
      const { service } = setupService();
      const mockTx = createMockTransaction();
      const mockResponse = createMockTransactionResponse();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
        accountId: {
          toString: jest.fn().mockReturnValue(MOCK_ACCOUNT_ID),
        },
      });
      const mockRecord = createMockTransactionRecord();

      mockTx.execute.mockResolvedValue(mockResponse);
      mockResponse.getReceipt.mockResolvedValue(mockReceipt);
      mockResponse.getRecord.mockResolvedValue(mockRecord);

      const result = await service.signAndExecuteWith(
        mockTx as unknown as HederaTransaction,
        [],
      );

      expect(result.accountId).toBe(MOCK_ACCOUNT_ID);
      expect(result.tokenId).toBeUndefined();
      expect(result.topicId).toBeUndefined();
      expect(result.topicSequenceNumber).toBeUndefined();
    });

    it('should return TransactionResult with tokenId when present', async () => {
      const { service } = setupService();
      const mockTx = createMockTransaction();
      const mockResponse = createMockTransactionResponse();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
        tokenId: {
          toString: jest.fn().mockReturnValue(MOCK_TOKEN_ID),
        },
      });
      const mockRecord = createMockTransactionRecord();

      mockTx.execute.mockResolvedValue(mockResponse);
      mockResponse.getReceipt.mockResolvedValue(mockReceipt);
      mockResponse.getRecord.mockResolvedValue(mockRecord);

      const result = await service.signAndExecuteWith(
        mockTx as unknown as HederaTransaction,
        [],
      );

      expect(result.tokenId).toBe(MOCK_TOKEN_ID);
    });

    it('should return TransactionResult with topicId and topicSequenceNumber when present', async () => {
      const { service } = setupService();
      const mockTx = createMockTransaction();
      const mockResponse = createMockTransactionResponse();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
        topicId: {
          toString: jest.fn().mockReturnValue(MOCK_TOPIC_ID),
        },
        topicSequenceNumber: BigInt(MOCK_TOPIC_SEQ),
      });
      const mockRecord = createMockTransactionRecord();

      mockTx.execute.mockResolvedValue(mockResponse);
      mockResponse.getReceipt.mockResolvedValue(mockReceipt);
      mockResponse.getRecord.mockResolvedValue(mockRecord);

      const result = await service.signAndExecuteWith(
        mockTx as unknown as HederaTransaction,
        [],
      );

      expect(result.topicId).toBe(MOCK_TOPIC_ID);
      expect(result.topicSequenceNumber).toBe(MOCK_TOPIC_SEQ);
    });

    it('should return success=false when status is not Success', async () => {
      const { service } = setupService();
      const mockTx = createMockTransaction();
      const mockResponse = createMockTransactionResponse();
      const mockReceipt = createMockTransactionReceipt({
        status: NonSuccessStatus, // Any status that !== Status.Success
      });
      const mockRecord = createMockTransactionRecord();

      mockTx.execute.mockResolvedValue(mockResponse);
      mockResponse.getReceipt.mockResolvedValue(mockReceipt);
      mockResponse.getRecord.mockResolvedValue(mockRecord);

      const result = await service.signAndExecuteWith(
        mockTx as unknown as HederaTransaction,
        [],
      );

      expect(result.success).toBe(false);
      expect(result.receipt.status.status).toBe('failed');
    });

    it('should throw TransactionError when transaction execution fails', async () => {
      const { service } = setupService();
      const mockTx = createMockTransaction();

      mockTx.execute.mockRejectedValue(new Error('Network error'));

      await expect(
        service.signAndExecuteWith(mockTx as unknown as HederaTransaction, []),
      ).rejects.toThrow(TransactionError);
    });

    it('should throw TransactionError when getting receipt fails', async () => {
      const { service } = setupService();
      const mockTx = createMockTransaction();
      const mockResponse = createMockTransactionResponse();

      mockTx.execute.mockResolvedValue(mockResponse);
      mockResponse.getReceipt.mockRejectedValue(new Error('Receipt error'));

      await expect(
        service.signAndExecuteWith(mockTx as unknown as HederaTransaction, []),
      ).rejects.toThrow(TransactionError);
    });
  });

  describe('signAndExecuteContractCreateFlowWith', () => {
    it('should sign contract create flow with unique keys and return result', async () => {
      const { service, logger, kms, mockClient } = setupService();
      const mockFlow = createMockContractCreateFlow();
      const mockResponse = createMockTransactionResponse();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
        contractId: {
          toString: jest.fn().mockReturnValue('0.0.9999'),
        },
      });
      const mockRecord = createMockTransactionRecord();

      mockFlow.execute.mockResolvedValue(mockResponse);
      mockResponse.getReceipt.mockResolvedValue(mockReceipt);
      mockResponse.getRecord.mockResolvedValue(mockRecord);

      const result = await service.signAndExecuteContractCreateFlowWith(
        mockFlow as unknown as ContractCreateFlow,
        [MOCK_KEY_REF_1, MOCK_KEY_REF_2],
      );

      expect(logger.debug).toHaveBeenCalledWith(
        '[TX-EXECUTION] Signing with 2 key(s)',
      );
      expect(kms.signContractCreateFlow).toHaveBeenCalledTimes(2);
      expect(kms.signContractCreateFlow).toHaveBeenNthCalledWith(
        1,
        mockFlow,
        MOCK_KEY_REF_1,
      );
      expect(kms.signContractCreateFlow).toHaveBeenNthCalledWith(
        2,
        mockFlow,
        MOCK_KEY_REF_2,
      );

      expect(mockFlow.execute).toHaveBeenCalledWith(mockClient);
      expect(mockResponse.getReceipt).toHaveBeenCalledWith(mockClient);
      expect(mockResponse.getRecord).toHaveBeenCalledWith(mockClient);

      expect(result.transactionId).toBe(MOCK_TX_ID);
      expect(result.success).toBe(true);
      expect(result.contractId).toBe('0.0.9999');
      expect(result.consensusTimestamp).toBe(MOCK_CONSENSUS_TS);
      expect(result.receipt.status.status).toBe('success');
      expect(mockClient.close).toHaveBeenCalled();
    });

    it('should deduplicate keyRefIds for contract create flow', async () => {
      const { service, kms } = setupService();
      const mockFlow = createMockContractCreateFlow();
      const mockResponse = createMockTransactionResponse();
      const mockReceipt = createMockTransactionReceipt({
        status: Status.Success,
      });
      const mockRecord = createMockTransactionRecord();

      mockFlow.execute.mockResolvedValue(mockResponse);
      mockResponse.getReceipt.mockResolvedValue(mockReceipt);
      mockResponse.getRecord.mockResolvedValue(mockRecord);

      await service.signAndExecuteContractCreateFlowWith(
        mockFlow as unknown as ContractCreateFlow,
        [MOCK_KEY_REF_1, MOCK_KEY_REF_2, MOCK_KEY_REF_1],
      );

      expect(kms.signContractCreateFlow).toHaveBeenCalledTimes(2);
      expect(kms.signContractCreateFlow).toHaveBeenCalledWith(
        mockFlow,
        MOCK_KEY_REF_1,
      );
      expect(kms.signContractCreateFlow).toHaveBeenCalledWith(
        mockFlow,
        MOCK_KEY_REF_2,
      );
    });

    it('should return success=false when contract create flow status is not Success', async () => {
      const { service } = setupService();
      const mockFlow = createMockContractCreateFlow();
      const mockResponse = createMockTransactionResponse();
      const mockReceipt = createMockTransactionReceipt({
        status: NonSuccessStatus,
      });
      const mockRecord = createMockTransactionRecord();

      mockFlow.execute.mockResolvedValue(mockResponse);
      mockResponse.getReceipt.mockResolvedValue(mockReceipt);
      mockResponse.getRecord.mockResolvedValue(mockRecord);

      const result = await service.signAndExecuteContractCreateFlowWith(
        mockFlow as unknown as ContractCreateFlow,
        [],
      );

      expect(result.success).toBe(false);
      expect(result.receipt.status.status).toBe('failed');
    });

    it('should throw TransactionError when contract create flow execution fails', async () => {
      const { service } = setupService();
      const mockFlow = createMockContractCreateFlow();

      mockFlow.execute.mockRejectedValue(new Error('Flow network error'));

      await expect(
        service.signAndExecuteContractCreateFlowWith(
          mockFlow as unknown as ContractCreateFlow,
          [],
        ),
      ).rejects.toThrow(TransactionError);
    });
  });
});

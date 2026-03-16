import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { BatchTransactionService } from '@/core/services/batch/batch-transaction-service.interface';

import { createMockTransaction } from '@/__tests__/mocks/hedera-sdk-mocks';
import { makeLogger } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { NotFoundError, ValidationError } from '@/core/errors';
import {
  batchExecute,
  ExecuteBatchOutputSchema,
} from '@/plugins/batch/commands/execute';
import { ZustandBatchStateHelper } from '@/plugins/batch/zustand-state-helper';

import {
  BATCH_NAME,
  mockBatchDataWithTransactions,
  mockExecutedBatchData,
} from './helpers/fixtures';
import { makeArgs, makeBatchApiMocks } from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandBatchStateHelper: jest.fn(),
}));

jest.mock('@hashgraph/sdk', () => {
  const actual = jest.requireActual('@hashgraph/sdk');
  return {
    ...actual,
    Transaction: {
      ...actual.Transaction,
      fromBytes: jest.fn().mockReturnValue({
        transactionId: {
          toString: jest.fn().mockReturnValue('0.0.1234@1234567890.000'),
        },
      }),
    },
  };
});

const MockedHelper = ZustandBatchStateHelper as jest.Mock;

describe('batch plugin - execute command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('executes batch successfully', async () => {
    const logger = makeLogger();
    const saveBatchMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getBatch: jest.fn().mockReturnValue({
        ...mockBatchDataWithTransactions,
        transactions: [...mockBatchDataWithTransactions.transactions],
      }),
      saveBatch: saveBatchMock,
    }));

    const { networkMock, kmsMock, txSignMock, txExecuteMock } =
      makeBatchApiMocks();

    const mockBatchTransaction = createMockTransaction();
    const batchServiceMock = {
      createBatchTransaction: jest.fn().mockReturnValue({
        transaction: mockBatchTransaction,
      }),
    };

    txExecuteMock.execute = jest.fn().mockResolvedValue({
      success: true,
      transactionId: '0.0.1234@1234567890.000000000',
      receipt: { status: { status: 'success' } },
    });

    const api: Partial<CoreApi> = {
      network: networkMock,
      kms: kmsMock,
      txSign: txSignMock,
      txExecute: txExecuteMock,
      batch: batchServiceMock as BatchTransactionService,
    };

    const args = makeArgs(api, logger, { name: BATCH_NAME });
    const result = await batchExecute(args);

    expect(saveBatchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        executed: true,
        success: true,
      }),
    );

    const output = assertOutput(result.result, ExecuteBatchOutputSchema);
    expect(output.batchName).toBe(BATCH_NAME);
    expect(output.success).toBe(true);
    expect(output.transactionId).toBe('0.0.1234@1234567890.000000000');
    expect(output.network).toBe('testnet');
  });

  test('marks batch as failed when execution fails', async () => {
    const logger = makeLogger();
    const saveBatchMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getBatch: jest.fn().mockReturnValue({
        ...mockBatchDataWithTransactions,
        transactions: [...mockBatchDataWithTransactions.transactions],
      }),
      saveBatch: saveBatchMock,
    }));

    const { networkMock, kmsMock, txSignMock, txExecuteMock } =
      makeBatchApiMocks();

    const mockBatchTransaction = createMockTransaction();
    const batchServiceMock = {
      createBatchTransaction: jest.fn().mockReturnValue({
        transaction: mockBatchTransaction,
      }),
    };

    txExecuteMock.execute = jest.fn().mockResolvedValue({
      success: false,
      transactionId: '0.0.1234@1234567890.000000001',
      receipt: { status: { status: 'failed' } },
    });

    const api: Partial<CoreApi> = {
      network: networkMock,
      kms: kmsMock,
      txSign: txSignMock,
      txExecute: txExecuteMock,
      batch: batchServiceMock as BatchTransactionService,
    };

    const args = makeArgs(api, logger, { name: BATCH_NAME });
    const result = await batchExecute(args);

    expect(saveBatchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        executed: true,
        success: false,
      }),
    );

    const output = assertOutput(result.result, ExecuteBatchOutputSchema);
    expect(output.success).toBe(false);
  });

  test('throws NotFoundError when batch does not exist', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getBatch: jest.fn().mockReturnValue(null),
    }));

    const { networkMock, kmsMock } = makeBatchApiMocks();
    const api: Partial<CoreApi> = {
      network: networkMock,
      kms: kmsMock,
    };

    const args = makeArgs(api, logger, { name: BATCH_NAME });

    await expect(batchExecute(args)).rejects.toThrow(NotFoundError);
  });

  test('throws ValidationError when batch already executed', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getBatch: jest.fn().mockReturnValue({ ...mockExecutedBatchData }),
    }));

    const { networkMock, kmsMock } = makeBatchApiMocks();
    const api: Partial<CoreApi> = {
      network: networkMock,
      kms: kmsMock,
    };

    const args = makeArgs(api, logger, { name: BATCH_NAME });

    await expect(batchExecute(args)).rejects.toThrow(ValidationError);
  });

  test('throws NotFoundError when operator not found', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getBatch: jest.fn().mockReturnValue({
        ...mockBatchDataWithTransactions,
        transactions: [...mockBatchDataWithTransactions.transactions],
      }),
    }));

    const { networkMock, kmsMock } = makeBatchApiMocks();
    networkMock.getOperator = jest.fn().mockReturnValue(null);

    const api: Partial<CoreApi> = {
      network: networkMock,
      kms: kmsMock,
    };

    const args = makeArgs(api, logger, { name: BATCH_NAME });

    await expect(batchExecute(args)).rejects.toThrow(NotFoundError);
  });

  test('throws NotFoundError when batch key not found in kms', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getBatch: jest.fn().mockReturnValue({
        ...mockBatchDataWithTransactions,
        transactions: [...mockBatchDataWithTransactions.transactions],
      }),
    }));

    const { networkMock, kmsMock } = makeBatchApiMocks();
    kmsMock.get = jest.fn().mockReturnValue(undefined);

    const api: Partial<CoreApi> = {
      network: networkMock,
      kms: kmsMock,
    };

    const args = makeArgs(api, logger, { name: BATCH_NAME });

    await expect(batchExecute(args)).rejects.toThrow(NotFoundError);
  });
});

import type { CoreApi } from '@/core/core-api/core-api.interface';
import type {
  PreExecuteTransactionParams,
  PreSignTransactionParams,
} from '@/core/hooks/types';
import type {
  BatchifyBuildTransactionResult,
  BatchifySignTransactionResult,
} from '@/plugins/batch/hooks/batchify/types';

import { createMockTransaction } from '@/__tests__/mocks/hedera-sdk-mocks';
import { makeLogger } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { NotFoundError } from '@/core/errors';
import { BatchBatchifyHook } from '@/plugins/batch/hooks/batchify/handler';
import { BatchifyOutputSchema } from '@/plugins/batch/hooks/batchify/output';
import { ZustandBatchStateHelper } from '@/plugins/batch/zustand-state-helper';

import {
  BATCH_COMPOSED_KEY,
  BATCH_KEY_REF_ID,
  BATCH_NAME,
  mockBatchData,
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
    PublicKey: {
      fromString: jest.fn().mockReturnValue({}),
    },
  };
});

const MockedHelper = ZustandBatchStateHelper as jest.Mock;

const createMockSignedTransaction = () => {
  const mock = createMockTransaction() as ReturnType<
    typeof createMockTransaction
  > & { toBytes: jest.Mock };
  (mock as Record<string, unknown>).toBytes = jest
    .fn()
    .mockReturnValue(Buffer.from('abcdef1234567890', 'hex'));
  return mock;
};

describe('batch plugin - batchify hook', () => {
  let hook: BatchBatchifyHook;

  beforeEach(() => {
    jest.clearAllMocks();
    hook = new BatchBatchifyHook();
  });

  describe('preSignTransactionHook', () => {
    test('returns without adding batch key when batch param is missing', async () => {
      const logger = makeLogger();
      const { networkMock, kmsMock } = makeBatchApiMocks();
      const api: Partial<CoreApi> = { network: networkMock, kms: kmsMock };

      const args = makeArgs(api, logger, {});
      const mockTransaction = createMockTransaction();
      const setBatchKeyMock = jest.fn().mockReturnThis();

      const params = {
        normalisedParams: {},
        buildTransactionResult: {
          transaction: { ...mockTransaction, setBatchKey: setBatchKeyMock },
        },
      } as unknown as PreSignTransactionParams<
        Record<string, unknown>,
        BatchifyBuildTransactionResult
      >;

      const result = await hook.preSignTransactionHook(
        args,
        params,
        'account_create',
      );

      expect(result.breakFlow).toBe(false);
      expect(result.result).toEqual({ message: 'No "batch" parameter found' });
      expect(setBatchKeyMock).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'No parameter "batch" found. Transaction will not be added to batch.',
      );
    });

    test('throws NotFoundError when batch does not exist', () => {
      const logger = makeLogger();
      MockedHelper.mockImplementation(() => ({
        getBatch: jest.fn().mockReturnValue(null),
      }));

      const { networkMock, kmsMock } = makeBatchApiMocks();
      const api: Partial<CoreApi> = { network: networkMock, kms: kmsMock };

      const args = makeArgs(api, logger, { batch: BATCH_NAME });
      const mockTransaction = createMockTransaction();
      const params = {
        normalisedParams: {},
        buildTransactionResult: { transaction: mockTransaction },
      } as unknown as PreSignTransactionParams<
        Record<string, unknown>,
        BatchifyBuildTransactionResult
      >;

      expect(() =>
        hook.preSignTransactionHook(args, params, 'account_create'),
      ).toThrow(NotFoundError);
    });

    test('throws ValidationError when batch already executed', () => {
      const logger = makeLogger();
      MockedHelper.mockImplementation(() => ({
        getBatch: jest.fn().mockReturnValue({ ...mockExecutedBatchData }),
      }));

      const { networkMock, kmsMock } = makeBatchApiMocks();
      const api: Partial<CoreApi> = { network: networkMock, kms: kmsMock };

      const args = makeArgs(api, logger, { batch: BATCH_NAME });
      const mockTransaction = createMockTransaction();
      const params = {
        normalisedParams: {},
        buildTransactionResult: { transaction: mockTransaction },
      } as unknown as PreSignTransactionParams<
        Record<string, unknown>,
        BatchifyBuildTransactionResult
      >;

      expect(() =>
        hook.preSignTransactionHook(args, params, 'account_create'),
      ).toThrow('has been already executed');
    });

    test('throws NotFoundError when batch key not found in kms', () => {
      const logger = makeLogger();
      MockedHelper.mockImplementation(() => ({
        getBatch: jest.fn().mockReturnValue({ ...mockBatchData }),
      }));

      const { networkMock, kmsMock } = makeBatchApiMocks();
      kmsMock.get = jest.fn().mockReturnValue(undefined);
      const api: Partial<CoreApi> = { network: networkMock, kms: kmsMock };

      const args = makeArgs(api, logger, { batch: BATCH_NAME });
      const mockTransaction = createMockTransaction();
      const params = {
        normalisedParams: {},
        buildTransactionResult: { transaction: mockTransaction },
      } as unknown as PreSignTransactionParams<
        Record<string, unknown>,
        BatchifyBuildTransactionResult
      >;

      expect(() =>
        hook.preSignTransactionHook(args, params, 'account_create'),
      ).toThrow('Batch key');
    });

    test('sets batch key on transaction when batch exists', async () => {
      const logger = makeLogger();
      MockedHelper.mockImplementation(() => ({
        getBatch: jest.fn().mockReturnValue({ ...mockBatchData }),
      }));

      const { networkMock, kmsMock } = makeBatchApiMocks();
      const api: Partial<CoreApi> = { network: networkMock, kms: kmsMock };

      const args = makeArgs(api, logger, { batch: BATCH_NAME });
      const mockTransaction = createMockTransaction();
      const setBatchKeyMock = jest.fn().mockReturnThis();
      const params = {
        normalisedParams: {},
        buildTransactionResult: {
          transaction: { ...mockTransaction, setBatchKey: setBatchKeyMock },
        },
      } as unknown as PreSignTransactionParams<
        Record<string, unknown>,
        BatchifyBuildTransactionResult
      >;

      const result = await hook.preSignTransactionHook(
        args,
        params,
        'account_create',
      );

      expect(result.breakFlow).toBe(false);
      expect(result.result).toEqual({ message: 'success' });
      expect(setBatchKeyMock).toHaveBeenCalled();
      expect(kmsMock.get).toHaveBeenCalledWith(BATCH_KEY_REF_ID);
    });
  });

  describe('preExecuteTransactionHook', () => {
    test('returns without adding to batch when batch param is missing', async () => {
      const logger = makeLogger();
      const { networkMock, kmsMock } = makeBatchApiMocks();
      const api: Partial<CoreApi> = { network: networkMock, kms: kmsMock };

      const args = makeArgs(api, logger, {});
      const mockSignedTx = createMockSignedTransaction();
      const params = {
        normalisedParams: { name: 'test' },
        buildTransactionResult: { transaction: {} },
        signTransactionResult: { signedTransaction: mockSignedTx },
      } as unknown as PreExecuteTransactionParams<
        Record<string, unknown>,
        BatchifyBuildTransactionResult,
        BatchifySignTransactionResult
      >;

      const result = await hook.preExecuteTransactionHook(
        args,
        params,
        'account_create',
      );

      expect(result.breakFlow).toBe(false);
      expect(result.result).toEqual({ message: 'No "batch" parameter found' });
    });

    test('throws NotFoundError when batch does not exist', () => {
      const logger = makeLogger();
      MockedHelper.mockImplementation(() => ({
        getBatch: jest.fn().mockReturnValue(null),
        saveBatch: jest.fn(),
      }));

      const { networkMock, kmsMock } = makeBatchApiMocks();
      const api: Partial<CoreApi> = { network: networkMock, kms: kmsMock };

      const args = makeArgs(api, logger, { batch: BATCH_NAME });
      const mockSignedTx = createMockSignedTransaction();
      const params = {
        normalisedParams: { name: 'test' },
        buildTransactionResult: { transaction: {} },
        signTransactionResult: { signedTransaction: mockSignedTx },
      } as unknown as PreExecuteTransactionParams<
        Record<string, unknown>,
        BatchifyBuildTransactionResult,
        BatchifySignTransactionResult
      >;

      expect(() =>
        hook.preExecuteTransactionHook(args, params, 'account_create'),
      ).toThrow('Batch not found');
    });

    test('throws ValidationError when batch exceeds maximum size', () => {
      const logger = makeLogger();
      const fullBatch = {
        ...mockBatchDataWithTransactions,
        transactions: Array.from({ length: 50 }, (_, i) => ({
          transactionBytes: `abcdef1234567890${i}`,
          order: i + 1,
          command: 'account_create',
          normalizedParams: {},
        })),
      };
      MockedHelper.mockImplementation(() => ({
        getBatch: jest.fn().mockReturnValue(fullBatch),
        saveBatch: jest.fn(),
      }));

      const { networkMock, kmsMock } = makeBatchApiMocks();
      const api: Partial<CoreApi> = { network: networkMock, kms: kmsMock };

      const args = makeArgs(api, logger, { batch: BATCH_NAME });
      const mockSignedTx = createMockSignedTransaction();
      const params = {
        normalisedParams: { name: 'test' },
        buildTransactionResult: { transaction: {} },
        signTransactionResult: { signedTransaction: mockSignedTx },
      } as unknown as PreExecuteTransactionParams<
        Record<string, unknown>,
        BatchifyBuildTransactionResult,
        BatchifySignTransactionResult
      >;

      expect(() =>
        hook.preExecuteTransactionHook(args, params, 'account_create'),
      ).toThrow('exceed batch transaction maximum size');
    });

    test('adds transaction to batch and returns breakFlow true', async () => {
      const logger = makeLogger();
      const saveBatchMock = jest.fn();
      const batchCopy = {
        ...mockBatchDataWithTransactions,
        transactions: [...mockBatchDataWithTransactions.transactions],
      };
      MockedHelper.mockImplementation(() => ({
        getBatch: jest.fn().mockReturnValue(batchCopy),
        saveBatch: saveBatchMock,
      }));

      const { networkMock, kmsMock } = makeBatchApiMocks();
      const api: Partial<CoreApi> = { network: networkMock, kms: kmsMock };

      const args = makeArgs(api, logger, { batch: BATCH_NAME });
      const mockSignedTx = createMockSignedTransaction();
      const normalisedParams = { name: 'myAccount', keyType: 'ECDSA' };
      const params = {
        normalisedParams,
        buildTransactionResult: { transaction: {} },
        signTransactionResult: { signedTransaction: mockSignedTx },
      } as unknown as PreExecuteTransactionParams<
        Record<string, unknown>,
        BatchifyBuildTransactionResult,
        BatchifySignTransactionResult
      >;

      const result = await hook.preExecuteTransactionHook(
        args,
        params,
        'account_create',
      );

      expect(result.breakFlow).toBe(true);
      expect(result.result).toEqual({
        batchName: BATCH_NAME,
        transactionOrder: 3,
      });
      expect(result.schema).toBe(BatchifyOutputSchema);

      const output = assertOutput(result.result, BatchifyOutputSchema);
      expect(output.batchName).toBe(BATCH_NAME);
      expect(output.transactionOrder).toBe(3);

      expect(saveBatchMock).toHaveBeenCalledWith(
        BATCH_COMPOSED_KEY,
        expect.objectContaining({
          transactions: expect.arrayContaining([
            expect.objectContaining({
              order: 3,
              command: 'account_create',
              normalizedParams: normalisedParams,
            }),
          ]),
        }),
      );
      expect(logger.info).toHaveBeenCalledWith(
        `Transaction added to batch '${BATCH_NAME}' at position 3`,
      );
    });

    test('adds first transaction to empty batch with order 1', async () => {
      const logger = makeLogger();
      const saveBatchMock = jest.fn();
      const emptyBatch = { ...mockBatchData, transactions: [] };
      MockedHelper.mockImplementation(() => ({
        getBatch: jest.fn().mockReturnValue(emptyBatch),
        saveBatch: saveBatchMock,
      }));

      const { networkMock, kmsMock } = makeBatchApiMocks();
      const api: Partial<CoreApi> = { network: networkMock, kms: kmsMock };

      const args = makeArgs(api, logger, { batch: BATCH_NAME });
      const mockSignedTx = createMockSignedTransaction();
      const params = {
        normalisedParams: {},
        buildTransactionResult: { transaction: {} },
        signTransactionResult: { signedTransaction: mockSignedTx },
      } as unknown as PreExecuteTransactionParams<
        Record<string, unknown>,
        BatchifyBuildTransactionResult,
        BatchifySignTransactionResult
      >;

      const result = await hook.preExecuteTransactionHook(
        args,
        params,
        'token_create-ft',
      );

      expect(result.breakFlow).toBe(true);
      expect(result.result).toEqual({
        batchName: BATCH_NAME,
        transactionOrder: 1,
      });
      expect(saveBatchMock).toHaveBeenCalledWith(
        BATCH_COMPOSED_KEY,
        expect.objectContaining({
          transactions: [
            expect.objectContaining({
              order: 1,
              command: 'token_create-ft',
              transactionBytes: 'abcdef1234567890',
            }),
          ],
        }),
      );
    });
  });
});

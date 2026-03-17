import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { PreOutputPreparationParams } from '@/core/hooks/types';
import type {
  BatchDataItem,
  BatchExecuteTransactionResult,
} from '@/core/types/shared.types';

import { makeArgs, makeLogger, makeStateMock } from '@/__tests__/mocks/mocks';
import { StateError } from '@/core/errors';
import { SupportedNetwork } from '@/core/types/shared.types';
import { TOPIC_CREATE_COMMAND_NAME } from '@/plugins/topic/commands/create';
import { TopicCreateBatchStateHook } from '@/plugins/topic/hooks/batch-create/handler';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTopicStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTopicStateHelper as jest.Mock;

const createBatchExecuteParams = (
  batchData: BatchExecuteTransactionResult['updatedBatchData'],
): PreOutputPreparationParams<
  unknown,
  unknown,
  unknown,
  BatchExecuteTransactionResult
> =>
  ({
    normalisedParams: {},
    buildTransactionResult: {},
    signTransactionResult: {},
    executeTransactionResult: { updatedBatchData: batchData },
  }) as PreOutputPreparationParams<
    unknown,
    unknown,
    unknown,
    BatchExecuteTransactionResult
  >;

const createTopicBatchDataItem = (
  overrides: Partial<BatchDataItem> = {},
): BatchDataItem => ({
  transactionBytes: 'abcdef1234567890',
  order: 1,
  command: TOPIC_CREATE_COMMAND_NAME,
  normalizedParams: {
    keyManager: 'local',
    network: SupportedNetwork.TESTNET,
  },
  transactionId: '0.0.1234@1234567890.000000000',
  ...overrides,
});

describe('topic plugin - batch-create hook', () => {
  let hook: TopicCreateBatchStateHook;

  beforeEach(() => {
    jest.clearAllMocks();
    hook = new TopicCreateBatchStateHook();
    MockedHelper.mockImplementation(() => ({
      saveTopic: jest.fn(),
    }));
  });

  test('returns batch transaction status failure when batch success is false', async () => {
    const logger = makeLogger();
    const api = {} as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: false,
      transactions: [createTopicBatchDataItem()],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({
      message: 'Batch transaction status failure',
    });
  });

  test('returns success when no topic_create transactions in batch', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveTopic: saveTopicMock }));

    const api = {
      receipt: { getReceipt: jest.fn() },
      alias: { register: jest.fn() },
      state: makeStateMock(),
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        {
          ...createTopicBatchDataItem(),
          command: 'token_create',
        },
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(saveTopicMock).not.toHaveBeenCalled();
    expect(api.receipt?.getReceipt).not.toHaveBeenCalled();
  });

  test('skips items with invalid normalizedParams and logs warn', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveTopic: saveTopicMock }));

    const api = {
      receipt: { getReceipt: jest.fn() },
      alias: { register: jest.fn() },
      state: makeStateMock(),
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        createTopicBatchDataItem({
          normalizedParams: { invalid: 'data' },
        }),
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(saveTopicMock).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'There was a problem with parsing data schema. The saving will not be done',
    );
  });

  test('skips items without transactionId and logs warn', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveTopic: saveTopicMock }));

    const api = {
      receipt: { getReceipt: jest.fn() },
      alias: { register: jest.fn() },
      state: makeStateMock(),
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [createTopicBatchDataItem({ transactionId: undefined })],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(saveTopicMock).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'No transaction ID found for batch transaction 1',
    );
  });

  test('throws StateError when receipt has no topicId', async () => {
    const logger = makeLogger();
    const getReceiptMock = jest.fn().mockResolvedValue({
      consensusTimestamp: '2024-01-01T00:00:00.000Z',
      topicId: undefined,
    });

    const api = {
      receipt: { getReceipt: getReceiptMock },
      alias: { register: jest.fn() },
      state: makeStateMock(),
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [createTopicBatchDataItem()],
    });

    await expect(hook.preOutputPreparationHook(args, params)).rejects.toThrow(
      StateError,
    );

    expect(getReceiptMock).toHaveBeenCalledWith({
      transactionId: '0.0.1234@1234567890.000000000',
    });
  });

  test('saves topic when batch has valid topic_create item without alias', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveTopic: saveTopicMock }));

    const getReceiptMock = jest.fn().mockResolvedValue({
      topicId: '0.0.9999',
      consensusTimestamp: '2024-01-01T00:00:00.000Z',
    });

    const api = {
      receipt: { getReceipt: getReceiptMock },
      alias: { register: jest.fn() },
      state: makeStateMock(),
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        createTopicBatchDataItem({
          normalizedParams: {
            keyManager: 'local',
            network: SupportedNetwork.TESTNET,
            memo: 'My topic memo',
          },
        }),
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(saveTopicMock).toHaveBeenCalledWith(
      'testnet:0.0.9999',
      expect.objectContaining({
        topicId: '0.0.9999',
        memo: 'My topic memo',
        network: SupportedNetwork.TESTNET,
        createdAt: '2024-01-01T00:00:00.000Z',
      }),
    );
    expect(api.alias?.register).not.toHaveBeenCalled();
  });

  test('registers alias and saves topic when batch has topic_create item with alias', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn();
    const registerMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveTopic: saveTopicMock }));

    const getReceiptMock = jest.fn().mockResolvedValue({
      topicId: '0.0.8888',
      consensusTimestamp: '2024-01-15T12:00:00.000Z',
    });

    const api = {
      receipt: { getReceipt: getReceiptMock },
      alias: { register: registerMock },
      state: makeStateMock(),
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        createTopicBatchDataItem({
          transactionId: '0.0.8888@1234567890.000000001',
          normalizedParams: {
            keyManager: 'local',
            network: SupportedNetwork.TESTNET,
            alias: 'my-topic-alias',
            memo: 'Aliased topic',
          },
        }),
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(registerMock).toHaveBeenCalledWith({
      alias: 'my-topic-alias',
      type: 'topic',
      network: SupportedNetwork.TESTNET,
      entityId: '0.0.8888',
      createdAt: '2024-01-15T12:00:00.000Z',
    });
    expect(saveTopicMock).toHaveBeenCalledWith(
      'testnet:0.0.8888',
      expect.objectContaining({
        name: 'my-topic-alias',
        topicId: '0.0.8888',
        memo: 'Aliased topic',
      }),
    );
  });

  test('processes multiple topic_create items', async () => {
    const logger = makeLogger();
    const saveTopicMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveTopic: saveTopicMock }));

    const getReceiptMock = jest
      .fn()
      .mockResolvedValueOnce({
        topicId: '0.0.1001',
        consensusTimestamp: '2024-01-01T00:00:00.000Z',
      })
      .mockResolvedValueOnce({
        topicId: '0.0.1002',
        consensusTimestamp: '2024-01-01T00:00:01.000Z',
      });

    const api = {
      receipt: { getReceipt: getReceiptMock },
      alias: { register: jest.fn() },
      state: makeStateMock(),
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        createTopicBatchDataItem({
          order: 1,
          transactionId: '0.0.1001@1234567890.000000000',
          normalizedParams: {
            keyManager: 'local',
            network: SupportedNetwork.TESTNET,
            memo: 'Topic 1',
          },
        }),
        createTopicBatchDataItem({
          order: 2,
          transactionId: '0.0.1002@1234567890.000000001',
          normalizedParams: {
            keyManager: 'local',
            network: SupportedNetwork.TESTNET,
            alias: 'topic-2-alias',
            memo: 'Topic 2',
          },
        }),
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(saveTopicMock).toHaveBeenCalledTimes(2);
    expect(saveTopicMock).toHaveBeenNthCalledWith(
      1,
      'testnet:0.0.1001',
      expect.objectContaining({ topicId: '0.0.1001', memo: 'Topic 1' }),
    );
    expect(saveTopicMock).toHaveBeenNthCalledWith(
      2,
      'testnet:0.0.1002',
      expect.objectContaining({
        topicId: '0.0.1002',
        name: 'topic-2-alias',
        memo: 'Topic 2',
      }),
    );
  });
});

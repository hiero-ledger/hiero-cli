import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { BatchDataItem } from '@/core/types/shared.types';
import type { TopicData } from '@/plugins/topic/schema';

import {
  createBatchExecuteParams,
  makeArgs,
  makeLogger,
  makeStateMock,
} from '@/__tests__/mocks/mocks';
import { SupportedNetwork } from '@/core/types/shared.types';
import { TOPIC_DELETE_COMMAND_NAME } from '@/plugins/topic/commands/delete/handler';
import { TopicDeleteStateHook } from '@/plugins/topic/hooks/topic-delete-state';
import { TopicHelper } from '@/plugins/topic/topic-helper';

jest.mock('../../topic-helper', () => ({
  TopicHelper: jest.fn(),
}));

const MockedTopicHelper = TopicHelper as jest.Mock;

const baseTopicToDelete = (): TopicData => ({
  topicId: '0.0.9999',
  network: SupportedNetwork.TESTNET,
  createdAt: '2024-01-01T00:00:00.000Z',
  adminKeyRefIds: [],
  submitKeyRefIds: [],
  adminKeyThreshold: 0,
  submitKeyThreshold: 0,
});

const validDeleteNormalizedParams = () => ({
  topicRef: 'my-topic-ref',
  network: SupportedNetwork.TESTNET,
  key: 'kr-delete',
  topicToDelete: baseTopicToDelete(),
  stateOnly: false,
});

const createDeleteBatchDataItem = (
  overrides: Partial<BatchDataItem> = {},
): BatchDataItem => ({
  transactionBytes: 'abcdef1234567890',
  order: 1,
  keyRefIds: [],
  command: TOPIC_DELETE_COMMAND_NAME,
  normalizedParams: validDeleteNormalizedParams(),
  transactionId: '0.0.1234@1234567890.000000000',
  ...overrides,
});

describe('topic plugin - TopicDeleteStateHook', () => {
  let hook: TopicDeleteStateHook;
  let removeTopicFromLocalStateMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    removeTopicFromLocalStateMock = jest.fn();
    MockedTopicHelper.mockImplementation(() => ({
      removeTopicFromLocalState: removeTopicFromLocalStateMock,
    }));
    hook = new TopicDeleteStateHook();
  });

  test('returns breakFlow false when batch execution failed', async () => {
    const logger = makeLogger();
    const api = {} as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: false,
      transactions: [createDeleteBatchDataItem()],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(removeTopicFromLocalStateMock).not.toHaveBeenCalled();
  });

  test('skips when batch has no topic_delete transactions', async () => {
    const logger = makeLogger();
    const api = { state: makeStateMock() } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        { ...createDeleteBatchDataItem(), command: 'topic_create' },
      ],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(removeTopicFromLocalStateMock).not.toHaveBeenCalled();
  });

  test('logs warn and skips cleanup when normalized params are invalid', async () => {
    const logger = makeLogger();
    const api = {
      state: makeStateMock(),
      alias: { list: jest.fn().mockReturnValue([]), remove: jest.fn() },
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        createDeleteBatchDataItem({
          normalizedParams: { invalid: 'data' },
        }),
      ],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(removeTopicFromLocalStateMock).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'Topic delete batch item skipped: normalized params did not match schema',
    );
  });

  test('does not remove from state when stateOnly is true', async () => {
    const logger = makeLogger();
    const api = {
      state: makeStateMock(),
      alias: { list: jest.fn().mockReturnValue([]), remove: jest.fn() },
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        createDeleteBatchDataItem({
          normalizedParams: {
            ...validDeleteNormalizedParams(),
            stateOnly: true,
          },
        }),
      ],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(removeTopicFromLocalStateMock).not.toHaveBeenCalled();
  });

  test('calls TopicHelper.removeTopicFromLocalState when delete succeeds', async () => {
    const logger = makeLogger();
    const api = {
      state: makeStateMock(),
      alias: { list: jest.fn().mockReturnValue([]), remove: jest.fn() },
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const topicToDelete = baseTopicToDelete();
    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        createDeleteBatchDataItem({
          normalizedParams: {
            ...validDeleteNormalizedParams(),
            topicToDelete,
          },
        }),
      ],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(removeTopicFromLocalStateMock).toHaveBeenCalledTimes(1);
    expect(removeTopicFromLocalStateMock).toHaveBeenCalledWith(
      topicToDelete,
      SupportedNetwork.TESTNET,
    );
  });
});

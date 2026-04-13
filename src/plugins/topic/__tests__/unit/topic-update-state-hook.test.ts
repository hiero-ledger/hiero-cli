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
import { composeKey } from '@/core/utils/key-composer';
import { TOPIC_UPDATE_COMMAND_NAME } from '@/plugins/topic/commands/update/handler';
import { TopicUpdateStateHook } from '@/plugins/topic/hooks/topic-update-state';
import { ZustandTopicStateHelper } from '@/plugins/topic/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTopicStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTopicStateHelper as jest.Mock;

const existingTopicData = (): TopicData => ({
  name: 'stored-topic',
  topicId: '0.0.12345',
  memo: 'old-memo',
  adminKeyRefIds: ['kr-admin-1'],
  submitKeyRefIds: ['kr-submit-1'],
  adminKeyThreshold: 1,
  submitKeyThreshold: 1,
  network: SupportedNetwork.TESTNET,
  autoRenewPeriod: 7776000,
  expirationTime: '2025-06-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
});

const baseUpdateNormalizedParams = () => {
  const existing = existingTopicData();
  return {
    topicId: existing.topicId,
    stateKey: composeKey(existing.network, existing.topicId),
    network: existing.network,
    existingTopicData: existing,
  };
};

const createUpdateBatchDataItem = (
  overrides: Partial<BatchDataItem> = {},
): BatchDataItem => ({
  transactionBytes: 'abcdef1234567890',
  order: 1,
  keyRefIds: [],
  command: TOPIC_UPDATE_COMMAND_NAME,
  normalizedParams: baseUpdateNormalizedParams(),
  transactionId: '0.0.1234@1234567890.000000000',
  ...overrides,
});

describe('topic plugin - TopicUpdateStateHook (batch)', () => {
  let hook: TopicUpdateStateHook;
  let saveTopicMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    saveTopicMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      saveTopic: saveTopicMock,
    }));
    hook = new TopicUpdateStateHook();
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
      transactions: [createUpdateBatchDataItem()],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(saveTopicMock).not.toHaveBeenCalled();
  });

  test('skips when batch has no topic_update transactions', async () => {
    const logger = makeLogger();
    const api = { state: makeStateMock() } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        { ...createUpdateBatchDataItem(), command: 'topic_create' },
      ],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(saveTopicMock).not.toHaveBeenCalled();
  });

  test('logs warn and skips save when normalized params are invalid', async () => {
    const logger = makeLogger();
    const api = { state: makeStateMock() } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        createUpdateBatchDataItem({
          normalizedParams: { invalid: 'data' },
        }),
      ],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(saveTopicMock).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'There was a problem with parsing data schema. The saving will not be done',
    );
  });

  test('persists merged topic data when memo is updated', async () => {
    const logger = makeLogger();
    const api = { state: makeStateMock() } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const base = baseUpdateNormalizedParams();
    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        createUpdateBatchDataItem({
          normalizedParams: {
            ...base,
            memo: 'new-memo',
          },
        }),
      ],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(saveTopicMock).toHaveBeenCalledTimes(1);
    const [stateKey, saved] = saveTopicMock.mock.calls[0];
    expect(stateKey).toBe(
      composeKey(SupportedNetwork.TESTNET, base.existingTopicData.topicId),
    );
    expect(saved.memo).toBe('new-memo');
    expect(saved.topicId).toBe(base.existingTopicData.topicId);
    expect(saved.adminKeyRefIds).toEqual(base.existingTopicData.adminKeyRefIds);
  });

  test('clears submit keys when newSubmitKeys is null', async () => {
    const logger = makeLogger();
    const api = { state: makeStateMock() } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const base = baseUpdateNormalizedParams();
    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        createUpdateBatchDataItem({
          normalizedParams: {
            ...base,
            newSubmitKeys: null,
          },
        }),
      ],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(saveTopicMock).toHaveBeenCalledTimes(1);
    const [, saved] = saveTopicMock.mock.calls[0];
    expect(saved.submitKeyRefIds).toEqual([]);
    expect(saved.submitKeyThreshold).toBe(0);
  });
});

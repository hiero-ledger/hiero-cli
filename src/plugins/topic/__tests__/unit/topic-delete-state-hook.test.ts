import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { BatchDataItem } from '@/core/types/shared.types';

import {
  createBatchExecuteParams,
  makeArgs,
  makeStateMock,
} from '@/__tests__/mocks/mocks';
import { SupportedNetwork } from '@/core/types/shared.types';
import { TOPIC_DELETE_COMMAND_NAME } from '@/plugins/topic/commands/delete/handler';
import { TopicDeleteStateHook } from '@/plugins/topic/hooks/topic-delete-state';
import { TopicStateServiceImpl } from '@/plugins/topic/services/topic-state.service';

jest.mock('@/plugins/topic/services/topic-state.service');
jest.mock('@/plugins/topic/services/topic-alias.service');

const MockedTopicStateService = TopicStateServiceImpl as jest.Mock;

const createDeleteBatchDataItem = (
  overrides: Partial<BatchDataItem> = {},
): BatchDataItem => ({
  transactionBytes: 'abcdef',
  order: 1,
  keyRefIds: [],
  command: TOPIC_DELETE_COMMAND_NAME,
  normalizedParams: { network: SupportedNetwork.TESTNET, topicId: '0.0.999' },
  transactionId: '0.0.1234@1234567890.000000000',
  ...overrides,
});

describe('topic plugin - TopicDeleteStateHook', () => {
  let applyMock: jest.Mock;
  let hook: TopicDeleteStateHook;

  beforeEach(() => {
    jest.clearAllMocks();
    applyMock = jest.fn().mockResolvedValue(undefined);
    MockedTopicStateService.mockImplementation(() => ({
      applyTopicDeleteFromBatchItem: applyMock,
    }));
    hook = new TopicDeleteStateHook();
  });

  test('returns breakFlow false when batch failed', async () => {
    const api = {} as Partial<CoreApi>;
    const args = makeArgs(api, {});
    const params = createBatchExecuteParams({
      name: 'b',
      keyRefId: 'kr',
      executed: true,
      success: false,
      transactions: [createDeleteBatchDataItem()],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(applyMock).not.toHaveBeenCalled();
  });

  test('delegates to apply for delete transactions', async () => {
    const api = { state: makeStateMock() } as Partial<CoreApi>;
    const args = makeArgs(api, {});
    const item = createDeleteBatchDataItem();
    const params = createBatchExecuteParams({
      name: 'b',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [item],
    });

    await hook.execute({ ...params, args });

    expect(applyMock).toHaveBeenCalledWith(item);
  });

  test('filters out non-delete commands', async () => {
    const api = { state: makeStateMock() } as Partial<CoreApi>;
    const args = makeArgs(api, {});
    const params = createBatchExecuteParams({
      name: 'b',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        { ...createDeleteBatchDataItem(), command: 'topic_create' },
      ],
    });

    await hook.execute({ ...params, args });

    expect(applyMock).not.toHaveBeenCalled();
  });
});

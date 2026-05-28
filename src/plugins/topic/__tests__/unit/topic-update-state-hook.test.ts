import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { BatchDataItem } from '@/core/types/shared.types';

import {
  createBatchExecuteParams,
  makeArgs,
  makeStateMock,
} from '@/__tests__/mocks/mocks';
import { SupportedNetwork } from '@/core/types/shared.types';
import { TOPIC_UPDATE_COMMAND_NAME } from '@/plugins/topic/commands/update/handler';
import { TopicUpdateStateHook } from '@/plugins/topic/hooks/topic-update-state';
import { TopicStateServiceImpl } from '@/plugins/topic/services/topic-state.service';

jest.mock('@/plugins/topic/services/topic-state.service');
jest.mock('@/plugins/topic/services/topic-alias.service');

const MockedTopicStateService = TopicStateServiceImpl as jest.Mock;

const createUpdateBatchDataItem = (
  overrides: Partial<BatchDataItem> = {},
): BatchDataItem => ({
  transactionBytes: 'abcdef',
  order: 1,
  keyRefIds: [],
  command: TOPIC_UPDATE_COMMAND_NAME,
  normalizedParams: { network: SupportedNetwork.TESTNET },
  transactionId: '0.0.1234@1234567890.000000000',
  ...overrides,
});

describe('topic plugin - TopicUpdateStateHook', () => {
  let applyMock: jest.Mock;
  let hook: TopicUpdateStateHook;

  beforeEach(() => {
    jest.clearAllMocks();
    applyMock = jest.fn().mockResolvedValue(undefined);
    MockedTopicStateService.mockImplementation(() => ({
      applyTopicUpdateFromBatchItem: applyMock,
    }));
    hook = new TopicUpdateStateHook();
  });

  test('returns breakFlow false when batch failed', async () => {
    const api = {} as Partial<CoreApi>;
    const args = makeArgs(api, {});
    const params = createBatchExecuteParams({
      name: 'b',
      keyRefId: 'kr',
      executed: true,
      success: false,
      transactions: [createUpdateBatchDataItem()],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(applyMock).not.toHaveBeenCalled();
  });

  test('delegates to apply for update transactions', async () => {
    const api = { state: makeStateMock() } as Partial<CoreApi>;
    const args = makeArgs(api, {});
    const item = createUpdateBatchDataItem();
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
});

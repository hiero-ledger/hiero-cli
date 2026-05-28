import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { BatchDataItem } from '@/core/types/shared.types';

import { createBatchExecuteParams, makeArgs } from '@/__tests__/mocks/mocks';
import { TOKEN_ASSOCIATE_COMMAND_NAME } from '@/plugins/token/commands/associate';
import { TokenAssociateStateHook } from '@/plugins/token/hooks/token-associate-state';
import { TokenStateServiceImpl } from '@/plugins/token/services/token-state.service';

jest.mock('@/plugins/token/services/token-state.service');

const MockedTokenStateService = TokenStateServiceImpl as jest.Mock;

const createBatchItem = (
  overrides: Partial<BatchDataItem> = {},
): BatchDataItem => ({
  transactionBytes: 'abcdef',
  order: 1,
  command: TOKEN_ASSOCIATE_COMMAND_NAME,
  keyRefIds: [],
  normalizedParams: {},
  transactionId: '0.0.1234@1234567890.000000000',
  ...overrides,
});

describe('token plugin - TokenAssociateStateHook', () => {
  let applyMock: jest.Mock;
  let hook: TokenAssociateStateHook;

  beforeEach(() => {
    jest.clearAllMocks();
    applyMock = jest.fn().mockResolvedValue(undefined);
    MockedTokenStateService.mockImplementation(() => ({
      applyAssociationFromBatchItem: applyMock,
    }));
    hook = new TokenAssociateStateHook();
  });

  test('returns breakFlow false when batch failed', async () => {
    const api = {} as Partial<CoreApi>;
    const args = makeArgs(api, {});
    const params = createBatchExecuteParams({
      name: 'b',
      keyRefId: 'kr',
      executed: true,
      success: false,
      transactions: [createBatchItem()],
    });
    const result = await hook.execute({ ...params, args });
    expect(result.breakFlow).toBe(false);
    expect(applyMock).not.toHaveBeenCalled();
  });

  test('delegates to apply', async () => {
    const api = {} as Partial<CoreApi>;
    const args = makeArgs(api, {});
    const item = createBatchItem();
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

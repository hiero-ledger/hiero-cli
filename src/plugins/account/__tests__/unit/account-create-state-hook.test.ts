import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { BatchDataItem } from '@/core/types/shared.types';

import { createBatchExecuteParams, makeArgs } from '@/__tests__/mocks/mocks';
import { ACCOUNT_CREATE_COMMAND_NAME } from '@/plugins/account/commands/create';
import { AccountCreateStateHook } from '@/plugins/account/hooks/account-create-state/handler';
import { AccountStateServiceImpl } from '@/plugins/account/services/account-state.service';

jest.mock('@/plugins/account/services/account-state.service');

const MockedAccountStateService = AccountStateServiceImpl as jest.Mock;

const createBatchItem = (
  overrides: Partial<BatchDataItem> = {},
): BatchDataItem => ({
  transactionBytes: 'abcdef',
  order: 1,
  command: ACCOUNT_CREATE_COMMAND_NAME,
  keyRefIds: [],
  normalizedParams: {},
  transactionId: '0.0.1234@1234567890.000000000',
  ...overrides,
});

describe('account plugin - AccountCreateStateHook', () => {
  let applyBatchMock: jest.Mock;
  let applyScheduleMock: jest.Mock;
  let hook: AccountCreateStateHook;

  beforeEach(() => {
    jest.clearAllMocks();
    applyBatchMock = jest.fn().mockResolvedValue(undefined);
    applyScheduleMock = jest.fn().mockResolvedValue(undefined);
    MockedAccountStateService.mockImplementation(() => ({
      applyAccountCreateFromBatchItem: applyBatchMock,
      applyAccountCreateFromSchedule: applyScheduleMock,
    }));
    hook = new AccountCreateStateHook();
  });

  test('delegates to apply for batch transactions', async () => {
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
    expect(applyBatchMock).toHaveBeenCalledWith(item);
  });

  test('returns breakFlow false', async () => {
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
  });
});

import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { BatchDataItem } from '@/core/types/shared.types';

import { createBatchExecuteParams, makeArgs } from '@/__tests__/mocks/mocks';
import { TOKEN_CREATE_FT_FROM_FILE_COMMAND_NAME } from '@/plugins/token/commands/create-ft-from-file';
import { TokenCreateFtFromFileStateHook } from '@/plugins/token/hooks/token-create-ft-from-file-state';
import { TokenFromFileStateServiceImpl } from '@/plugins/token/services/token-from-file-state.service';

jest.mock('@/plugins/token/services/token-state.service');
jest.mock('@/plugins/token/services/token-associations.service');
jest.mock('@/plugins/token/services/token-from-file-state.service');

const MockedFromFileService = TokenFromFileStateServiceImpl as jest.Mock;

const createBatchItem = (
  overrides: Partial<BatchDataItem> = {},
): BatchDataItem => ({
  transactionBytes: 'abcdef',
  order: 1,
  command: TOKEN_CREATE_FT_FROM_FILE_COMMAND_NAME,
  keyRefIds: [],
  normalizedParams: {},
  transactionId: '0.0.1234@1234567890.000000000',
  ...overrides,
});

describe('token plugin - TokenCreateFtFromFileStateHook', () => {
  let applyMock: jest.Mock;
  let hook: TokenCreateFtFromFileStateHook;

  beforeEach(() => {
    jest.clearAllMocks();
    applyMock = jest.fn().mockResolvedValue(undefined);
    MockedFromFileService.mockImplementation(() => ({
      applyCreateFtFromFileFromBatchItem: applyMock,
    }));
    hook = new TokenCreateFtFromFileStateHook();
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

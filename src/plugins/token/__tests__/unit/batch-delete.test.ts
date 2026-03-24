import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { BatchDataItem } from '@/core/types/shared.types';

import {
  createBatchExecuteParams,
  makeArgs,
  makeLogger,
  makeStateMock,
} from '@/__tests__/mocks/mocks';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { SupportedNetwork } from '@/core/types/shared.types';
import { TOKEN_DELETE_COMMAND_NAME } from '@/plugins/token/commands/delete';
import { TokenDeleteBatchStateHook } from '@/plugins/token/hooks/batch-delete/handler';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

const createDeleteBatchDataItem = (
  overrides: Partial<BatchDataItem> = {},
): BatchDataItem => ({
  transactionBytes: 'abcdef1234567890',
  order: 1,
  command: TOKEN_DELETE_COMMAND_NAME,
  normalizedParams: {
    network: SupportedNetwork.TESTNET,
    tokenId: '0.0.123456',
    tokenName: 'TestToken',
  },
  transactionId: '0.0.1234@1234567890.000000000',
  ...overrides,
});

describe('token plugin - batch-delete hook', () => {
  let hook: TokenDeleteBatchStateHook;

  beforeEach(() => {
    jest.clearAllMocks();
    hook = new TokenDeleteBatchStateHook();
    MockedHelper.mockImplementation(() => ({
      getToken: jest
        .fn()
        .mockReturnValue({ tokenId: '0.0.123456', name: 'TestToken' }),
      removeToken: jest.fn(),
    }));
  });

  test('returns batch failure message when batch success is false', async () => {
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

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({
      message: 'Batch transaction status failure',
    });
  });

  test('returns success when no token_delete transactions in batch', async () => {
    const removeTokenMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getToken: jest.fn().mockReturnValue({}),
      removeToken: removeTokenMock,
    }));

    const api = {
      state: makeStateMock(),
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, makeLogger(), {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        { ...createDeleteBatchDataItem(), command: 'token_mint-ft' },
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(removeTokenMock).not.toHaveBeenCalled();
  });

  test('skips items with invalid normalizedParams and logs warn', async () => {
    const removeTokenMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getToken: jest.fn().mockReturnValue({}),
      removeToken: removeTokenMock,
    }));

    const logger = makeLogger();
    const api = {
      state: makeStateMock(),
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        createDeleteBatchDataItem({ normalizedParams: { invalid: 'data' } }),
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(removeTokenMock).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'Problem parsing delete batch data. State cleanup skipped.',
    );
  });

  test('cleans up state when token found - removeToken + aliases removed', async () => {
    const removeTokenMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getToken: jest
        .fn()
        .mockReturnValue({ tokenId: '0.0.123456', name: 'TestToken' }),
      removeToken: removeTokenMock,
    }));

    const removeAliasMock = jest.fn();
    const api = {
      state: makeStateMock(),
      alias: {
        list: jest.fn().mockReturnValue([
          {
            alias: 'my-token',
            entityId: '0.0.123456',
            type: AliasType.Token,
            network: SupportedNetwork.TESTNET,
          },
        ]),
        remove: removeAliasMock,
      },
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, makeLogger(), {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [createDeleteBatchDataItem()],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(removeTokenMock).toHaveBeenCalledWith('testnet:0.0.123456');
    expect(removeAliasMock).toHaveBeenCalledWith(
      'my-token',
      SupportedNetwork.TESTNET,
    );
  });

  test('skips state cleanup when token not in state', async () => {
    const removeTokenMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getToken: jest.fn().mockReturnValue(null),
      removeToken: removeTokenMock,
    }));

    const api = {
      state: makeStateMock(),
      alias: { list: jest.fn().mockReturnValue([]) },
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, makeLogger(), {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [createDeleteBatchDataItem()],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(removeTokenMock).not.toHaveBeenCalled();
  });

  test('processes multiple token_delete items', async () => {
    const removeTokenMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getToken: jest.fn().mockReturnValue({ tokenId: 'mock', name: 'mock' }),
      removeToken: removeTokenMock,
    }));

    const api = {
      state: makeStateMock(),
      alias: { list: jest.fn().mockReturnValue([]) },
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, makeLogger(), {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        createDeleteBatchDataItem({
          order: 1,
          normalizedParams: {
            network: SupportedNetwork.TESTNET,
            tokenId: '0.0.1001',
            tokenName: 'Token1',
          },
        }),
        createDeleteBatchDataItem({
          order: 2,
          normalizedParams: {
            network: SupportedNetwork.TESTNET,
            tokenId: '0.0.1002',
            tokenName: 'Token2',
          },
        }),
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(removeTokenMock).toHaveBeenCalledTimes(2);
    expect(removeTokenMock).toHaveBeenCalledWith('testnet:0.0.1001');
    expect(removeTokenMock).toHaveBeenCalledWith('testnet:0.0.1002');
  });
});

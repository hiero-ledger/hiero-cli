import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { BatchDataItem } from '@/core/types/shared.types';

import {
  createBatchExecuteParams,
  makeArgs,
  makeLogger,
  makeStateMock,
} from '@/__tests__/mocks/mocks';
import { StateError } from '@/core/errors';
import { SupportedNetwork } from '@/core/types/shared.types';
import { TOKEN_CREATE_FT_FROM_FILE_COMMAND_NAME } from '@/plugins/token/commands/create-ft-from-file';
import { TokenCreateFtFromFileBatchStateHook } from '@/plugins/token/hooks/batch-create-ft-from-file/handler';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { mockAccountIds, validTokenFile } from './helpers/fixtures';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

jest.mock('../../utils/token-associations', () => ({
  processTokenAssociations: jest.fn().mockResolvedValue([]),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

const createFtFromFileBatchDataItem = (
  overrides: Partial<BatchDataItem> = {},
): BatchDataItem => ({
  transactionBytes: '0xabcdef1234567890',
  order: 1,
  command: TOKEN_CREATE_FT_FROM_FILE_COMMAND_NAME,
  normalizedParams: {
    keyManager: 'local',
    network: SupportedNetwork.TESTNET,
    tokenDefinition: validTokenFile,
    treasury: {
      accountId: mockAccountIds.treasury,
      keyRefId: 'kr-treasury',
      publicKey: 'pk-treasury',
    },
    adminKey: {
      keyRefId: 'kr-admin',
      publicKey: 'pk-admin',
    },
  },
  transactionId: '0.0.1234@1234567890.000000000',
  ...overrides,
});

describe('token plugin - batch-create-ft-from-file hook', () => {
  let hook: TokenCreateFtFromFileBatchStateHook;

  beforeEach(() => {
    jest.clearAllMocks();
    hook = new TokenCreateFtFromFileBatchStateHook();
    MockedHelper.mockImplementation(() => ({
      saveToken: jest.fn(),
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
      transactions: [createFtFromFileBatchDataItem()],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({
      message: 'Batch transaction status failure',
    });
  });

  test('returns success when no token_create-ft-from-file transactions in batch', async () => {
    const logger = makeLogger();
    const saveTokenMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveToken: saveTokenMock }));

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
          ...createFtFromFileBatchDataItem(),
          command: 'token_create-ft',
        },
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(saveTokenMock).not.toHaveBeenCalled();
    expect(api.receipt?.getReceipt).not.toHaveBeenCalled();
  });

  test('skips items with invalid normalizedParams and logs warn', async () => {
    const logger = makeLogger();
    const saveTokenMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveToken: saveTokenMock }));

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
        createFtFromFileBatchDataItem({
          normalizedParams: { invalid: 'data' },
        }),
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(saveTokenMock).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'There was a problem with parsing data schema. The saving will not be done',
    );
  });

  test('skips items without transactionId and logs warn', async () => {
    const logger = makeLogger();
    const saveTokenMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveToken: saveTokenMock }));

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
        createFtFromFileBatchDataItem({ transactionId: undefined }),
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(saveTokenMock).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'No transaction ID found for batch transaction 1',
    );
  });

  test('throws StateError when receipt has no tokenId', async () => {
    const logger = makeLogger();
    const getReceiptMock = jest.fn().mockResolvedValue({
      consensusTimestamp: '2024-01-01T00:00:00.000Z',
      transactionId: '0.0.1234@1234567890.000000000',
      tokenId: undefined,
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
      transactions: [createFtFromFileBatchDataItem()],
    });

    await expect(hook.preOutputPreparationHook(args, params)).rejects.toThrow(
      StateError,
    );

    expect(getReceiptMock).toHaveBeenCalledWith({
      transactionId: '0.0.1234@1234567890.000000000',
    });
  });

  test('saves token and registers alias when batch has valid token_create-ft-from-file item', async () => {
    const logger = makeLogger();
    const saveTokenMock = jest.fn();
    const registerMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveToken: saveTokenMock }));

    const getReceiptMock = jest.fn().mockResolvedValue({
      tokenId: '0.0.9999',
      consensusTimestamp: '2024-01-01T00:00:00.000Z',
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
        createFtFromFileBatchDataItem({
          normalizedParams: {
            keyManager: 'local',
            network: SupportedNetwork.TESTNET,
            tokenDefinition: {
              ...validTokenFile,
              name: 'MyToken',
              symbol: 'MTK',
              decimals: 6,
              supplyType: 'infinite' as const,
              initialSupply: '1000000',
              maxSupply: '0',
              associations: [],
              customFees: [],
              memo: 'My token memo',
            },
            treasury: {
              accountId: mockAccountIds.treasury,
              keyRefId: 'kr-treasury',
              publicKey: 'pk-treasury',
            },
            adminKey: { keyRefId: 'kr-admin', publicKey: 'pk-admin' },
          },
        }),
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(saveTokenMock).toHaveBeenCalledWith(
      'testnet:0.0.9999',
      expect.objectContaining({
        tokenId: '0.0.9999',
        name: 'MyToken',
        symbol: 'MTK',
        treasuryId: mockAccountIds.treasury,
        decimals: 6,
        initialSupply: 1000000n,
      }),
    );
    expect(registerMock).toHaveBeenCalledWith({
      alias: 'MyToken',
      type: 'token',
      network: SupportedNetwork.TESTNET,
      entityId: '0.0.9999',
      createdAt: '2024-01-01T00:00:00.000Z',
    });
    expect(logger.info).toHaveBeenCalledWith('   Token data saved to state');
    expect(logger.info).toHaveBeenCalledWith('   Name registered: MyToken');
  });

  test('processes multiple token_create-ft-from-file items', async () => {
    const logger = makeLogger();
    const saveTokenMock = jest.fn();
    const registerMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveToken: saveTokenMock }));

    const getReceiptMock = jest
      .fn()
      .mockResolvedValueOnce({
        tokenId: '0.0.1001',
        consensusTimestamp: '2024-01-01T00:00:00.000Z',
      })
      .mockResolvedValueOnce({
        tokenId: '0.0.1002',
        consensusTimestamp: '2024-01-01T00:00:01.000Z',
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
        createFtFromFileBatchDataItem({
          order: 1,
          transactionId: '0.0.1001@1234567890.000000000',
          normalizedParams: {
            keyManager: 'local',
            network: SupportedNetwork.TESTNET,
            tokenDefinition: {
              ...validTokenFile,
              name: 'Token1',
              symbol: 'TK1',
              initialSupply: '100',
              maxSupply: '1000',
              associations: [],
              customFees: [],
              memo: '',
            },
            treasury: {
              accountId: mockAccountIds.treasury,
              keyRefId: 'kr-treasury',
              publicKey: 'pk-treasury',
            },
            adminKey: { keyRefId: 'kr-admin', publicKey: 'pk-admin' },
          },
        }),
        createFtFromFileBatchDataItem({
          order: 2,
          transactionId: '0.0.1002@1234567890.000000001',
          normalizedParams: {
            keyManager: 'local',
            network: SupportedNetwork.TESTNET,
            tokenDefinition: {
              ...validTokenFile,
              name: 'Token2',
              symbol: 'TK2',
              decimals: 6,
              supplyType: 'infinite' as const,
              initialSupply: '1000',
              maxSupply: '0',
              associations: [],
              customFees: [],
              memo: 'Token 2',
            },
            treasury: {
              accountId: mockAccountIds.treasury,
              keyRefId: 'kr-treasury',
              publicKey: 'pk-treasury',
            },
            adminKey: { keyRefId: 'kr-admin', publicKey: 'pk-admin' },
          },
        }),
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(saveTokenMock).toHaveBeenCalledTimes(2);
    expect(saveTokenMock).toHaveBeenNthCalledWith(
      1,
      'testnet:0.0.1001',
      expect.objectContaining({ name: 'Token1', tokenId: '0.0.1001' }),
    );
    expect(saveTokenMock).toHaveBeenNthCalledWith(
      2,
      'testnet:0.0.1002',
      expect.objectContaining({ name: 'Token2', tokenId: '0.0.1002' }),
    );
    expect(registerMock).toHaveBeenCalledTimes(2);
  });
});

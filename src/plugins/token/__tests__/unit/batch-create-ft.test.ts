import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { BatchDataItem } from '@/core/types/shared.types';

import {
  createBatchExecuteParams,
  makeArgs,
  makeLogger,
  makeStateMock,
} from '@/__tests__/mocks/mocks';
import { StateError } from '@/core/errors';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { HederaTokenType } from '@/core/shared/constants';
import { SupplyType, SupportedNetwork } from '@/core/types/shared.types';
import { TOKEN_CREATE_FT_COMMAND_NAME } from '@/plugins/token/commands/create-ft';
import { TokenCreateFtStateHook } from '@/plugins/token/hooks/token-create-ft-state';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

const createFtBatchDataItem = (
  overrides: Partial<BatchDataItem> = {},
): BatchDataItem => ({
  transactionBytes: '0xabcdef1234567890',
  order: 1,
  command: TOKEN_CREATE_FT_COMMAND_NAME,
  keyRefIds: [],
  normalizedParams: {
    name: 'TestToken',
    symbol: 'TEST',
    decimals: 2,
    initialSupply: 1000n,
    supplyType: SupplyType.INFINITE,
    tokenType: HederaTokenType.FUNGIBLE_COMMON,
    network: SupportedNetwork.TESTNET,
    keyManager: KeyManager.local,
    treasury: {
      accountId: '0.0.123456',
      keyRefId: 'kr-treasury',
      publicKey: 'pk-treasury',
    },
    admin: {
      accountId: '0.0.100000',
      keyRefId: 'kr-admin',
      publicKey: 'pk-admin',
    },
    freezeDefault: false,
  },
  transactionId: '0.0.1234@1234567890.000000000',
  ...overrides,
});

describe('token plugin - batch-create-ft hook', () => {
  let hook: TokenCreateFtStateHook;

  beforeEach(() => {
    jest.clearAllMocks();
    hook = new TokenCreateFtStateHook();
    MockedHelper.mockImplementation(() => ({
      saveToken: jest.fn(),
    }));
  });

  test('returns success when no token_create-ft transactions in batch', async () => {
    const logger = makeLogger();
    const saveTokenMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveToken: saveTokenMock }));

    const api = {
      receipt: { getReceipt: jest.fn() },
      alias: { register: jest.fn(), exists: jest.fn().mockReturnValue(false) },
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
          ...createFtBatchDataItem(),
          command: 'token_create',
        },
      ],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(saveTokenMock).not.toHaveBeenCalled();
    expect(api.receipt?.getReceipt).not.toHaveBeenCalled();
  });

  test('skips items with invalid normalizedParams and logs warn', async () => {
    const logger = makeLogger();
    const saveTokenMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveToken: saveTokenMock }));

    const api = {
      receipt: { getReceipt: jest.fn() },
      alias: { register: jest.fn(), exists: jest.fn().mockReturnValue(false) },
      state: makeStateMock(),
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        createFtBatchDataItem({
          normalizedParams: { invalid: 'data' },
        }),
      ],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
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
      alias: { register: jest.fn(), exists: jest.fn().mockReturnValue(false) },
      state: makeStateMock(),
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [createFtBatchDataItem({ transactionId: undefined })],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
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
      alias: { register: jest.fn(), exists: jest.fn().mockReturnValue(false) },
      state: makeStateMock(),
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [createFtBatchDataItem()],
    });

    await expect(hook.execute({ ...params, args })).rejects.toThrow(StateError);

    expect(getReceiptMock).toHaveBeenCalledWith({
      transactionId: '0.0.1234@1234567890.000000000',
    });
  });

  test('saves token when batch has valid token_create-ft item without alias', async () => {
    const logger = makeLogger();
    const saveTokenMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveToken: saveTokenMock }));

    const getReceiptMock = jest.fn().mockResolvedValue({
      tokenId: '0.0.9999',
      consensusTimestamp: '2024-01-01T00:00:00.000Z',
    });

    const api = {
      receipt: { getReceipt: getReceiptMock },
      alias: { register: jest.fn(), exists: jest.fn().mockReturnValue(false) },
      state: makeStateMock(),
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        createFtBatchDataItem({
          normalizedParams: {
            name: 'MyToken',
            symbol: 'MTK',
            decimals: 6,
            initialSupply: 1000000n,
            supplyType: SupplyType.FINITE,
            tokenType: HederaTokenType.FUNGIBLE_COMMON,
            network: SupportedNetwork.TESTNET,
            keyManager: KeyManager.local,
            treasury: {
              accountId: '0.0.123456',
              keyRefId: 'kr-treasury',
              publicKey: 'pk-treasury',
            },
            admin: {
              accountId: '0.0.100000',
              keyRefId: 'kr-admin',
              publicKey: 'pk-admin',
            },
          },
        }),
      ],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(saveTokenMock).toHaveBeenCalledWith(
      'testnet:0.0.9999',
      expect.objectContaining({
        tokenId: '0.0.9999',
        name: 'MyToken',
        symbol: 'MTK',
        treasuryId: '0.0.123456',
        decimals: 6,
        initialSupply: 1000000n,
        tokenType: HederaTokenType.FUNGIBLE_COMMON,
        supplyType: 'FINITE',
        adminPublicKey: 'pk-admin',
        network: SupportedNetwork.TESTNET,
      }),
    );
    expect(api.alias?.register).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('   Token data saved to state');
  });

  test('registers alias and saves token when batch has token_create-ft item with alias', async () => {
    const logger = makeLogger();
    const saveTokenMock = jest.fn();
    const registerMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveToken: saveTokenMock }));

    const getReceiptMock = jest.fn().mockResolvedValue({
      tokenId: '0.0.8888',
      consensusTimestamp: '2024-01-15T12:00:00.000Z',
    });

    const api = {
      receipt: { getReceipt: getReceiptMock },
      alias: {
        register: registerMock,
        exists: jest.fn().mockReturnValue(false),
      },
      state: makeStateMock(),
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        createFtBatchDataItem({
          transactionId: '0.0.8888@1234567890.000000001',
          normalizedParams: {
            name: 'AliasedToken',
            symbol: 'ALT',
            decimals: 2,
            initialSupply: 500n,
            supplyType: SupplyType.INFINITE,
            tokenType: HederaTokenType.FUNGIBLE_COMMON,
            network: SupportedNetwork.TESTNET,
            keyManager: KeyManager.local,
            alias: 'my-token-alias',
            treasury: {
              accountId: '0.0.123456',
              keyRefId: 'kr-treasury',
              publicKey: 'pk-treasury',
            },
            admin: {
              accountId: '0.0.100000',
              keyRefId: 'kr-admin',
              publicKey: 'pk-admin',
            },
          },
        }),
      ],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(registerMock).toHaveBeenCalledWith({
      alias: 'my-token-alias',
      type: 'token',
      network: SupportedNetwork.TESTNET,
      entityId: '0.0.8888',
      createdAt: '2024-01-15T12:00:00.000Z',
    });
    expect(saveTokenMock).toHaveBeenCalledWith(
      'testnet:0.0.8888',
      expect.objectContaining({
        name: 'AliasedToken',
        tokenId: '0.0.8888',
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      '   Name registered: my-token-alias',
    );
  });

  test('processes multiple token_create-ft items', async () => {
    const logger = makeLogger();
    const saveTokenMock = jest.fn();
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
      alias: { register: jest.fn(), exists: jest.fn().mockReturnValue(false) },
      state: makeStateMock(),
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        createFtBatchDataItem({
          order: 1,
          transactionId: '0.0.1001@1234567890.000000000',
          normalizedParams: {
            name: 'Token1',
            symbol: 'TK1',
            decimals: 2,
            initialSupply: 100n,
            supplyType: SupplyType.INFINITE,
            tokenType: HederaTokenType.FUNGIBLE_COMMON,
            network: SupportedNetwork.TESTNET,
            keyManager: KeyManager.local,
            treasury: {
              accountId: '0.0.123456',
              keyRefId: 'kr-treasury',
              publicKey: 'pk-treasury',
            },
            admin: {
              accountId: '0.0.100000',
              keyRefId: 'kr-admin',
              publicKey: 'pk-admin',
            },
          },
        }),
        createFtBatchDataItem({
          order: 2,
          transactionId: '0.0.1002@1234567890.000000001',
          normalizedParams: {
            name: 'Token2',
            symbol: 'TK2',
            decimals: 6,
            initialSupply: 1000n,
            supplyType: SupplyType.FINITE,
            tokenType: HederaTokenType.FUNGIBLE_COMMON,
            network: SupportedNetwork.TESTNET,
            keyManager: KeyManager.local,
            treasury: {
              accountId: '0.0.123456',
              keyRefId: 'kr-treasury',
              publicKey: 'pk-treasury',
            },
            admin: {
              accountId: '0.0.100000',
              keyRefId: 'kr-admin',
              publicKey: 'pk-admin',
            },
          },
        }),
      ],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
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
  });

  test('warns and skips alias registration when alias already exists', async () => {
    const logger = makeLogger();
    const saveTokenMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveToken: saveTokenMock }));

    const getReceiptMock = jest.fn().mockResolvedValue({
      tokenId: '0.0.8888',
      consensusTimestamp: '2024-01-15T12:00:00.000Z',
    });

    const api = {
      receipt: { getReceipt: getReceiptMock },
      alias: { register: jest.fn(), exists: jest.fn().mockReturnValue(true) },
      state: makeStateMock(),
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [
        createFtBatchDataItem({
          transactionId: '0.0.8888@1234567890.000000001',
          normalizedParams: {
            name: 'MyToken',
            symbol: 'MTK',
            decimals: 2,
            initialSupply: 500n,
            supplyType: SupplyType.INFINITE,
            tokenType: HederaTokenType.FUNGIBLE_COMMON,
            network: SupportedNetwork.TESTNET,
            keyManager: KeyManager.local,
            alias: 'my-alias',
            treasury: {
              accountId: '0.0.123456',
              keyRefId: 'kr-treasury',
              publicKey: 'pk-treasury',
            },
            admin: {
              accountId: '0.0.100000',
              keyRefId: 'kr-admin',
              publicKey: 'pk-admin',
            },
          },
        }),
      ],
    });

    await hook.execute({ ...params, args });

    expect(api.alias?.register).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'Alias "my-alias" already exists, skipping registration',
    );
  });
});

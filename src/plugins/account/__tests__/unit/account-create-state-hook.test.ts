import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { BatchDataItem } from '@/core/types/shared.types';

import {
  createBatchExecuteParams,
  makeLogger,
  makeStateMock,
} from '@/__tests__/mocks/mocks';
import { StateError } from '@/core/errors';
import { KeyAlgorithm } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';
import { ACCOUNT_CREATE_COMMAND_NAME } from '@/plugins/account/commands/create';
import { AccountCreateStateHook } from '@/plugins/account/hooks/account-create-state';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

import { makeArgs } from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandAccountStateHelper: jest.fn(),
}));

jest.mock('@hashgraph/sdk', () => {
  const actual = jest.requireActual('@hashgraph/sdk');
  return {
    ...actual,
    AccountId: {
      fromString: jest.fn().mockImplementation((id: string) => {
        const parts = id.split('.');
        const num = parseInt(parts[parts.length - 1] || '0', 10);
        return {
          toSolidityAddress: () => num.toString(16).padStart(40, '0'),
        };
      }),
    },
  };
});

const MockedHelper = ZustandAccountStateHelper as jest.Mock;

const createAccountBatchDataItem = (
  overrides: Partial<BatchDataItem> = {},
): BatchDataItem => ({
  transactionBytes: 'abcdef1234567890',
  order: 1,
  command: ACCOUNT_CREATE_COMMAND_NAME,
  keyRefIds: [],
  normalizedParams: {
    maxAutoAssociations: 0,
    name: 'test-account',
    publicKey: 'pk-test',
    keyRefId: 'kr-test',
    keyType: KeyAlgorithm.ECDSA,
    network: SupportedNetwork.TESTNET,
  },
  transactionId: '0.0.1234@1234567890.000000000',
  ...overrides,
});

describe('account plugin - batch-create hook', () => {
  let hook: AccountCreateStateHook;

  beforeEach(() => {
    jest.clearAllMocks();
    hook = new AccountCreateStateHook();
    MockedHelper.mockImplementation(() => ({
      saveAccount: jest.fn(),
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
      transactions: [createAccountBatchDataItem()],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
  });

  test('returns success when no account_create transactions in batch', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveAccount: saveAccountMock }));

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
          ...createAccountBatchDataItem(),
          command: 'token_create',
        },
      ],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(saveAccountMock).not.toHaveBeenCalled();
    expect(api.receipt?.getReceipt).not.toHaveBeenCalled();
  });

  test('skips items with invalid normalizedParams and logs warn', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveAccount: saveAccountMock }));

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
        createAccountBatchDataItem({
          normalizedParams: { invalid: 'data' },
        }),
      ],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(saveAccountMock).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'There was a problem with parsing data schema. The saving will not be done',
    );
  });

  test('skips items without transactionId and logs warn', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveAccount: saveAccountMock }));

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
      transactions: [createAccountBatchDataItem({ transactionId: undefined })],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(saveAccountMock).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'No transaction ID found for batch transaction 1',
    );
  });

  test('throws StateError when receipt has no accountId', async () => {
    const logger = makeLogger();
    const getReceiptMock = jest.fn().mockResolvedValue({
      consensusTimestamp: '2024-01-01T00:00:00.000Z',
      accountId: undefined,
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
      transactions: [createAccountBatchDataItem()],
    });

    await expect(hook.execute({ ...params, args })).rejects.toThrow(StateError);

    expect(getReceiptMock).toHaveBeenCalledWith({
      transactionId: '0.0.1234@1234567890.000000000',
    });
  });

  test('saves account when batch has valid account_create item without alias', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveAccount: saveAccountMock }));

    const getReceiptMock = jest.fn().mockResolvedValue({
      accountId: '0.0.9999',
      consensusTimestamp: '2024-01-01T00:00:00.000Z',
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
      transactions: [
        createAccountBatchDataItem({
          normalizedParams: {
            maxAutoAssociations: 0,
            name: 'my-account',
            publicKey: 'pk-test',
            keyRefId: 'kr-test',
            keyType: KeyAlgorithm.ECDSA,
            network: SupportedNetwork.TESTNET,
          },
        }),
      ],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(saveAccountMock).toHaveBeenCalledWith(
      'testnet:0.0.9999',
      expect.objectContaining({
        name: 'my-account',
        accountId: '0.0.9999',
        type: KeyAlgorithm.ECDSA,
        publicKey: 'pk-test',
        keyRefId: 'kr-test',
        network: SupportedNetwork.TESTNET,
        evmAddress: '0x000000000000000000000000000000000000270f',
      }),
    );
    expect(api.alias?.register).not.toHaveBeenCalled();
  });

  test('registers alias and saves account when batch has account_create item with alias', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    const registerMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveAccount: saveAccountMock }));

    const getReceiptMock = jest.fn().mockResolvedValue({
      accountId: '0.0.8888',
      consensusTimestamp: '2024-01-15T12:00:00.000Z',
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
        createAccountBatchDataItem({
          transactionId: '0.0.8888@1234567890.000000001',
          normalizedParams: {
            maxAutoAssociations: 0,
            name: 'aliased-account',
            alias: 'my-account-alias',
            publicKey: 'pk-alias',
            keyRefId: 'kr-alias',
            keyType: KeyAlgorithm.ECDSA,
            network: SupportedNetwork.TESTNET,
          },
        }),
      ],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(registerMock).toHaveBeenCalledWith({
      alias: 'my-account-alias',
      type: 'account',
      network: SupportedNetwork.TESTNET,
      entityId: '0.0.8888',
      evmAddress: '0x00000000000000000000000000000000000022b8',
      publicKey: 'pk-alias',
      keyRefId: 'kr-alias',
      createdAt: '2024-01-15T12:00:00.000Z',
    });
    expect(saveAccountMock).toHaveBeenCalledWith(
      'testnet:0.0.8888',
      expect.objectContaining({
        name: 'aliased-account',
        accountId: '0.0.8888',
      }),
    );
  });

  test('processes multiple account_create items', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveAccount: saveAccountMock }));

    const getReceiptMock = jest
      .fn()
      .mockResolvedValueOnce({
        accountId: '0.0.1001',
        consensusTimestamp: '2024-01-01T00:00:00.000Z',
      })
      .mockResolvedValueOnce({
        accountId: '0.0.1002',
        consensusTimestamp: '2024-01-01T00:00:01.000Z',
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
      transactions: [
        createAccountBatchDataItem({
          order: 1,
          transactionId: '0.0.1001@1234567890.000000000',
          normalizedParams: {
            maxAutoAssociations: 0,
            name: 'acc1',
            publicKey: 'pk1',
            keyRefId: 'kr1',
            keyType: KeyAlgorithm.ECDSA,
            network: SupportedNetwork.TESTNET,
          },
        }),
        createAccountBatchDataItem({
          order: 2,
          transactionId: '0.0.1002@1234567890.000000001',
          normalizedParams: {
            maxAutoAssociations: 0,
            name: 'acc2',
            publicKey: 'pk2',
            keyRefId: 'kr2',
            keyType: KeyAlgorithm.ED25519,
            network: SupportedNetwork.TESTNET,
          },
        }),
      ],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(saveAccountMock).toHaveBeenCalledTimes(2);
    expect(saveAccountMock).toHaveBeenNthCalledWith(
      1,
      'testnet:0.0.1001',
      expect.objectContaining({ name: 'acc1', accountId: '0.0.1001' }),
    );
    expect(saveAccountMock).toHaveBeenNthCalledWith(
      2,
      'testnet:0.0.1002',
      expect.objectContaining({ name: 'acc2', accountId: '0.0.1002' }),
    );
  });
});

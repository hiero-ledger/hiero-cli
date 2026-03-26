import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { BatchDataItem } from '@/core/types/shared.types';

import {
  MOCK_ACCOUNT_ID,
  MOCK_ACCOUNT_ID_ALT,
} from '@/__tests__/mocks/fixtures';
import {
  createBatchExecuteParams,
  makeLogger,
  makeStateMock,
} from '@/__tests__/mocks/mocks';
import { KeyAlgorithm } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';
import { makeArgs } from '@/plugins/account/__tests__/unit/helpers/mocks';
import { ACCOUNT_UPDATE_COMMAND_NAME } from '@/plugins/account/commands/update/handler';
import { AccountUpdateBatchStateHook } from '@/plugins/account/hooks/batch-update/handler';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

jest.mock('../../../../zustand-state-helper', () => ({
  ZustandAccountStateHelper: jest.fn(),
}));

const MockedHelper = ZustandAccountStateHelper as jest.Mock;

const existingAccountData = {
  name: 'test-account',
  accountId: MOCK_ACCOUNT_ID,
  type: KeyAlgorithm.ECDSA,
  publicKey: 'old-pk',
  evmAddress: '0x0000000000000000000000000000000000000000',
  keyRefId: 'kr_old',
  network: SupportedNetwork.TESTNET,
};

const createUpdateBatchDataItem = (
  overrides: Partial<BatchDataItem> = {},
): BatchDataItem => ({
  transactionBytes: 'abcdef1234567890',
  order: 1,
  command: ACCOUNT_UPDATE_COMMAND_NAME,
  normalizedParams: {
    accountId: MOCK_ACCOUNT_ID,
    network: SupportedNetwork.TESTNET,
    accountStateKey: `testnet:${MOCK_ACCOUNT_ID}`,
    newPublicKey: 'new-pk',
    newKeyRefId: 'kr_new',
    newKeyType: KeyAlgorithm.ECDSA,
  },
  transactionId: `${MOCK_ACCOUNT_ID}@1234567890.000000000`,
  ...overrides,
});

describe('account plugin - batch-update hook', () => {
  let hook: AccountUpdateBatchStateHook;

  beforeEach(() => {
    jest.clearAllMocks();
    hook = new AccountUpdateBatchStateHook();
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(existingAccountData),
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
      transactions: [createUpdateBatchDataItem()],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({
      message: 'Batch transaction status failure',
    });
  });

  test('returns success and skips when no account_update transactions in batch', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn(),
      saveAccount: saveAccountMock,
    }));

    const api = {
      alias: {
        list: jest.fn().mockReturnValue([]),
        remove: jest.fn(),
        register: jest.fn(),
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
        { ...createUpdateBatchDataItem(), command: 'token_create' },
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(saveAccountMock).not.toHaveBeenCalled();
  });

  test('skips items with invalid normalizedParams and logs warn', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn(),
      saveAccount: saveAccountMock,
    }));

    const api = {
      alias: {
        list: jest.fn().mockReturnValue([]),
        remove: jest.fn(),
        register: jest.fn(),
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
        createUpdateBatchDataItem({ normalizedParams: { invalid: 'data' } }),
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(saveAccountMock).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'There was a problem with parsing data schema. The saving will not be done',
    );
  });

  test('skips state update when no key rotation (newKeyRefId absent)', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn(),
      saveAccount: saveAccountMock,
    }));

    const api = {
      alias: {
        list: jest.fn().mockReturnValue([]),
        remove: jest.fn(),
        register: jest.fn(),
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
        createUpdateBatchDataItem({
          normalizedParams: {
            accountId: MOCK_ACCOUNT_ID,
            network: SupportedNetwork.TESTNET,
            accountStateKey: `testnet:${MOCK_ACCOUNT_ID}`,
          },
        }),
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(saveAccountMock).not.toHaveBeenCalled();
  });

  test('logs warn and skips when account not found in state', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(null),
      saveAccount: saveAccountMock,
    }));

    const api = {
      alias: {
        list: jest.fn().mockReturnValue([]),
        remove: jest.fn(),
        register: jest.fn(),
      },
      state: makeStateMock(),
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [createUpdateBatchDataItem()],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(saveAccountMock).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('not found in state'),
    );
  });

  test('updates account state on key rotation', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(existingAccountData),
      saveAccount: saveAccountMock,
    }));

    const api = {
      alias: {
        list: jest.fn().mockReturnValue([]),
        remove: jest.fn(),
        register: jest.fn(),
      },
      state: makeStateMock(),
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [createUpdateBatchDataItem()],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(saveAccountMock).toHaveBeenCalledWith(
      `testnet:${MOCK_ACCOUNT_ID}`,
      expect.objectContaining({
        keyRefId: 'kr_new',
        publicKey: 'new-pk',
        type: KeyAlgorithm.ECDSA,
      }),
    );
  });

  test('re-registers aliases with new key on key rotation', async () => {
    const logger = makeLogger();
    const removeMock = jest.fn();
    const registerMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(existingAccountData),
      saveAccount: jest.fn(),
    }));

    const aliasRecord = {
      alias: 'my-account',
      type: 'account',
      network: SupportedNetwork.TESTNET,
      entityId: MOCK_ACCOUNT_ID,
      publicKey: 'old-pk',
      keyRefId: 'kr_old',
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    const api = {
      alias: {
        list: jest.fn().mockReturnValue([aliasRecord]),
        remove: removeMock,
        register: registerMock,
      },
      state: makeStateMock(),
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [createUpdateBatchDataItem()],
    });

    await hook.preOutputPreparationHook(args, params);

    expect(removeMock).toHaveBeenCalledWith(
      'my-account',
      SupportedNetwork.TESTNET,
    );
    expect(registerMock).toHaveBeenCalledWith({
      ...aliasRecord,
      publicKey: 'new-pk',
      keyRefId: 'kr_new',
    });
  });

  test('processes multiple account_update items independently', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(existingAccountData),
      saveAccount: saveAccountMock,
    }));

    const api = {
      alias: {
        list: jest.fn().mockReturnValue([]),
        remove: jest.fn(),
        register: jest.fn(),
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
        createUpdateBatchDataItem({
          order: 1,
          normalizedParams: {
            accountId: MOCK_ACCOUNT_ID,
            network: SupportedNetwork.TESTNET,
            accountStateKey: `testnet:${MOCK_ACCOUNT_ID}`,
            newPublicKey: 'new-pk-1',
            newKeyRefId: 'kr_new_1',
          },
        }),
        createUpdateBatchDataItem({
          order: 2,
          normalizedParams: {
            accountId: MOCK_ACCOUNT_ID_ALT,
            network: SupportedNetwork.TESTNET,
            accountStateKey: `testnet:${MOCK_ACCOUNT_ID_ALT}`,
            newPublicKey: 'new-pk-2',
            newKeyRefId: 'kr_new_2',
          },
        }),
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(saveAccountMock).toHaveBeenCalledTimes(2);
    expect(saveAccountMock).toHaveBeenCalledWith(
      `testnet:${MOCK_ACCOUNT_ID}`,
      expect.objectContaining({ keyRefId: 'kr_new_1', publicKey: 'new-pk-1' }),
    );
    expect(saveAccountMock).toHaveBeenCalledWith(
      `testnet:${MOCK_ACCOUNT_ID_ALT}`,
      expect.objectContaining({ keyRefId: 'kr_new_2', publicKey: 'new-pk-2' }),
    );
  });

  test('ignores non-account_update items in mixed batch', async () => {
    const logger = makeLogger();
    const saveAccountMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(existingAccountData),
      saveAccount: saveAccountMock,
    }));

    const api = {
      alias: {
        list: jest.fn().mockReturnValue([]),
        remove: jest.fn(),
        register: jest.fn(),
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
        {
          ...createUpdateBatchDataItem({ order: 1 }),
          command: 'account_create',
        },
        { ...createUpdateBatchDataItem({ order: 2 }), command: 'token_create' },
        createUpdateBatchDataItem({ order: 3 }),
      ],
    });

    await hook.preOutputPreparationHook(args, params);

    expect(saveAccountMock).toHaveBeenCalledTimes(1);
  });
});

import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { BatchDataItem } from '@/core/types/shared.types';

import {
  createBatchExecuteParams,
  makeArgs,
  makeLogger,
  makeStateMock,
} from '@/__tests__/mocks/mocks';
import { SupportedNetwork } from '@/core/types/shared.types';
import { TOKEN_ASSOCIATE_COMMAND_NAME } from '@/plugins/token/commands/associate';
import { TokenAssociateBatchStateHook } from '@/plugins/token/hooks/batch-associate/handler';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

const createAssociateBatchDataItem = (
  overrides: Partial<BatchDataItem> = {},
): BatchDataItem => ({
  transactionBytes: 'abcdef1234567890',
  order: 1,
  command: TOKEN_ASSOCIATE_COMMAND_NAME,
  normalizedParams: {
    network: SupportedNetwork.TESTNET,
    tokenId: '0.0.123456',
    account: {
      accountId: '0.0.100000',
      keyRefId: 'kr-account',
      publicKey: 'pk-account',
    },
    keyManager: 'local',
    alreadyAssociated: false,
  },
  transactionId: '0.0.1234@1234567890.000000000',
  ...overrides,
});

describe('token plugin - batch-associate hook', () => {
  let hook: TokenAssociateBatchStateHook;

  beforeEach(() => {
    jest.clearAllMocks();
    hook = new TokenAssociateBatchStateHook();
    MockedHelper.mockImplementation(() => ({
      getToken: jest.fn().mockReturnValue({ tokenId: '0.0.123456' }),
      addTokenAssociation: jest.fn(),
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
      transactions: [createAssociateBatchDataItem()],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({
      message: 'Batch transaction status failure',
    });
  });

  test('returns success when no token_associate transactions in batch', async () => {
    const logger = makeLogger();
    const addTokenAssociationMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getToken: jest.fn().mockReturnValue({}),
      addTokenAssociation: addTokenAssociationMock,
    }));

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
        {
          ...createAssociateBatchDataItem(),
          command: 'token_create-ft',
        },
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(addTokenAssociationMock).not.toHaveBeenCalled();
  });

  test('skips items with invalid normalizedParams and logs warn', async () => {
    const logger = makeLogger();
    const addTokenAssociationMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getToken: jest.fn().mockReturnValue({}),
      addTokenAssociation: addTokenAssociationMock,
    }));

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
        createAssociateBatchDataItem({
          normalizedParams: { invalid: 'data' },
        }),
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(addTokenAssociationMock).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'There was a problem with parsing data schema. The saving will not be done',
    );
  });

  test('skips items when alreadyAssociated is true and logs debug', async () => {
    const logger = makeLogger();
    const addTokenAssociationMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getToken: jest.fn().mockReturnValue({ tokenId: '0.0.123456' }),
      addTokenAssociation: addTokenAssociationMock,
    }));

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
        createAssociateBatchDataItem({
          normalizedParams: {
            network: SupportedNetwork.TESTNET,
            tokenId: '0.0.123456',
            account: {
              accountId: '0.0.100000',
              keyRefId: 'kr-account',
              publicKey: 'pk-account',
            },
            keyManager: 'local',
            alreadyAssociated: true,
          },
        }),
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(addTokenAssociationMock).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      'Skipping already associated token 0.0.123456 for account 0.0.100000',
    );
  });

  test('saves association when batch has valid token_associate item', async () => {
    const logger = makeLogger();
    const addTokenAssociationMock = jest.fn();
    const getTokenMock = jest.fn().mockReturnValue({ tokenId: '0.0.9999' });
    MockedHelper.mockImplementation(() => ({
      getToken: getTokenMock,
      addTokenAssociation: addTokenAssociationMock,
    }));

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
        createAssociateBatchDataItem({
          normalizedParams: {
            network: SupportedNetwork.TESTNET,
            tokenId: '0.0.9999',
            account: {
              accountId: '0.0.8888',
              keyRefId: 'kr-account',
              publicKey: 'pk-account',
            },
            keyManager: 'local',
            alreadyAssociated: false,
          },
        }),
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(addTokenAssociationMock).toHaveBeenCalledWith(
      'testnet:0.0.9999',
      '0.0.8888',
      '0.0.8888',
    );
    expect(logger.info).toHaveBeenCalledWith(
      '   Association saved to token state',
    );
  });

  test('does not save when token not found in state', async () => {
    const logger = makeLogger();
    const addTokenAssociationMock = jest.fn();
    const getTokenMock = jest.fn().mockReturnValue(null);
    MockedHelper.mockImplementation(() => ({
      getToken: getTokenMock,
      addTokenAssociation: addTokenAssociationMock,
    }));

    const api = {
      state: makeStateMock(),
    } as unknown as Partial<CoreApi>;
    const args = makeArgs(api, logger, {});

    const params = createBatchExecuteParams({
      name: 'batch',
      keyRefId: 'kr',
      executed: true,
      success: true,
      transactions: [createAssociateBatchDataItem()],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(addTokenAssociationMock).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalledWith(
      '   Association saved to token state',
    );
  });

  test('processes multiple token_associate items', async () => {
    const logger = makeLogger();
    const addTokenAssociationMock = jest.fn();
    const getTokenMock = jest.fn().mockReturnValue({ tokenId: '0.0.123456' });
    MockedHelper.mockImplementation(() => ({
      getToken: getTokenMock,
      addTokenAssociation: addTokenAssociationMock,
    }));

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
        createAssociateBatchDataItem({
          order: 1,
          normalizedParams: {
            network: SupportedNetwork.TESTNET,
            tokenId: '0.0.1001',
            account: {
              accountId: '0.0.2001',
              keyRefId: 'kr-1',
              publicKey: 'pk-1',
            },
            keyManager: 'local',
            alreadyAssociated: false,
          },
        }),
        createAssociateBatchDataItem({
          order: 2,
          normalizedParams: {
            network: SupportedNetwork.TESTNET,
            tokenId: '0.0.1002',
            account: {
              accountId: '0.0.2002',
              keyRefId: 'kr-2',
              publicKey: 'pk-2',
            },
            keyManager: 'local',
            alreadyAssociated: false,
          },
        }),
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(addTokenAssociationMock).toHaveBeenCalledTimes(2);
    expect(addTokenAssociationMock).toHaveBeenNthCalledWith(
      1,
      'testnet:0.0.1001',
      '0.0.2001',
      '0.0.2001',
    );
    expect(addTokenAssociationMock).toHaveBeenNthCalledWith(
      2,
      'testnet:0.0.1002',
      '0.0.2002',
      '0.0.2002',
    );
  });
});

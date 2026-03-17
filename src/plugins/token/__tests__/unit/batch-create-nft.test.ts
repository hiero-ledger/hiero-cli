import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { PreOutputPreparationParams } from '@/core/hooks/types';
import type {
  BatchDataItem,
  BatchExecuteTransactionResult,
} from '@/core/types/shared.types';

import { makeArgs, makeLogger, makeStateMock } from '@/__tests__/mocks/mocks';
import { StateError } from '@/core/errors';
import { HederaTokenType } from '@/core/shared/constants';
import { SupplyType, SupportedNetwork } from '@/core/types/shared.types';
import { TOKEN_CREATE_NFT_COMMAND_NAME } from '@/plugins/token/commands/create-nft';
import { TokenCreateNftBatchStateHook } from '@/plugins/token/hooks/batch-create-nft/handler';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

const createBatchExecuteParams = (
  batchData: BatchExecuteTransactionResult['updatedBatchData'],
): PreOutputPreparationParams<
  unknown,
  unknown,
  unknown,
  BatchExecuteTransactionResult
> =>
  ({
    normalisedParams: {},
    buildTransactionResult: {},
    signTransactionResult: {},
    executeTransactionResult: { updatedBatchData: batchData },
  }) as PreOutputPreparationParams<
    unknown,
    unknown,
    unknown,
    BatchExecuteTransactionResult
  >;

const createNftBatchDataItem = (
  overrides: Partial<BatchDataItem> = {},
): BatchDataItem => ({
  transactionBytes: 'abcdef1234567890',
  order: 1,
  command: TOKEN_CREATE_NFT_COMMAND_NAME,
  normalizedParams: {
    name: 'TestNFT',
    symbol: 'TNFT',
    decimals: 0,
    initialSupply: 0n,
    supplyType: SupplyType.INFINITE,
    tokenType: HederaTokenType.NON_FUNGIBLE_TOKEN,
    network: SupportedNetwork.TESTNET,
    keyManager: 'local',
    adminKeyProvided: true,
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
    supply: {
      accountId: '0.0.100000',
      keyRefId: 'kr-supply',
      publicKey: 'pk-supply',
    },
  },
  transactionId: '0.0.1234@1234567890.000000000',
  ...overrides,
});

describe('token plugin - batch-create-nft hook', () => {
  let hook: TokenCreateNftBatchStateHook;

  beforeEach(() => {
    jest.clearAllMocks();
    hook = new TokenCreateNftBatchStateHook();
    MockedHelper.mockImplementation(() => ({
      saveToken: jest.fn(),
    }));
  });

  test('returns success when no token_create-nft transactions in batch', async () => {
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
          ...createNftBatchDataItem(),
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
        createNftBatchDataItem({
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
      transactions: [createNftBatchDataItem({ transactionId: undefined })],
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
      transactions: [createNftBatchDataItem()],
    });

    await expect(hook.preOutputPreparationHook(args, params)).rejects.toThrow(
      StateError,
    );

    expect(getReceiptMock).toHaveBeenCalledWith({
      transactionId: '0.0.1234@1234567890.000000000',
    });
  });

  test('saves nft when batch has valid token_create-nft item without alias', async () => {
    const logger = makeLogger();
    const saveTokenMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveToken: saveTokenMock }));

    const getReceiptMock = jest.fn().mockResolvedValue({
      tokenId: '0.0.9999',
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
        createNftBatchDataItem({
          normalizedParams: {
            name: 'MyNFT',
            symbol: 'MNFT',
            decimals: 0,
            initialSupply: 0n,
            supplyType: SupplyType.INFINITE,
            tokenType: HederaTokenType.NON_FUNGIBLE_TOKEN,
            network: SupportedNetwork.TESTNET,
            keyManager: 'local',
            adminKeyProvided: true,
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
            supply: {
              accountId: '0.0.100000',
              keyRefId: 'kr-supply',
              publicKey: 'pk-supply',
            },
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
        name: 'MyNFT',
        symbol: 'MNFT',
        treasuryId: '0.0.123456',
        decimals: 0,
        initialSupply: 0n,
        tokenType: HederaTokenType.NON_FUNGIBLE_TOKEN,
        supplyType: 'INFINITE',
        adminPublicKey: 'pk-admin',
        supplyPublicKey: 'pk-supply',
        network: SupportedNetwork.TESTNET,
      }),
    );
    expect(api.alias?.register).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      '   Non-fungible token data saved to state',
    );
  });

  test('registers alias and saves nft when batch has token_create-nft item with alias', async () => {
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
        createNftBatchDataItem({
          transactionId: '0.0.8888@1234567890.000000001',
          normalizedParams: {
            name: 'AliasedNFT',
            symbol: 'ANFT',
            decimals: 0,
            initialSupply: 0n,
            supplyType: SupplyType.INFINITE,
            tokenType: HederaTokenType.NON_FUNGIBLE_TOKEN,
            network: SupportedNetwork.TESTNET,
            keyManager: 'local',
            adminKeyProvided: true,
            alias: 'my-nft-alias',
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
            supply: {
              accountId: '0.0.100000',
              keyRefId: 'kr-supply',
              publicKey: 'pk-supply',
            },
          },
        }),
      ],
    });

    const result = await hook.preOutputPreparationHook(args, params);

    expect(result.breakFlow).toBe(false);
    expect(result.result).toEqual({ message: 'success' });
    expect(registerMock).toHaveBeenCalledWith({
      alias: 'my-nft-alias',
      type: 'token',
      network: SupportedNetwork.TESTNET,
      entityId: '0.0.8888',
      createdAt: '2024-01-15T12:00:00.000Z',
    });
    expect(saveTokenMock).toHaveBeenCalledWith(
      'testnet:0.0.8888',
      expect.objectContaining({
        name: 'AliasedNFT',
        tokenId: '0.0.8888',
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      '   Name registered: my-nft-alias',
    );
  });

  test('processes multiple token_create-nft items', async () => {
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
        createNftBatchDataItem({
          order: 1,
          transactionId: '0.0.1001@1234567890.000000000',
          normalizedParams: {
            name: 'NFT1',
            symbol: 'NF1',
            decimals: 0,
            initialSupply: 0n,
            supplyType: SupplyType.INFINITE,
            tokenType: HederaTokenType.NON_FUNGIBLE_TOKEN,
            network: SupportedNetwork.TESTNET,
            keyManager: 'local',
            adminKeyProvided: true,
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
            supply: {
              accountId: '0.0.100000',
              keyRefId: 'kr-supply',
              publicKey: 'pk-supply',
            },
          },
        }),
        createNftBatchDataItem({
          order: 2,
          transactionId: '0.0.1002@1234567890.000000001',
          normalizedParams: {
            name: 'NFT2',
            symbol: 'NF2',
            decimals: 0,
            initialSupply: 0n,
            supplyType: SupplyType.FINITE,
            tokenType: HederaTokenType.NON_FUNGIBLE_TOKEN,
            network: SupportedNetwork.TESTNET,
            keyManager: 'local',
            adminKeyProvided: false,
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
            supply: {
              accountId: '0.0.100000',
              keyRefId: 'kr-supply',
              publicKey: 'pk-supply',
            },
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
      expect.objectContaining({ name: 'NFT1', tokenId: '0.0.1001' }),
    );
    expect(saveTokenMock).toHaveBeenNthCalledWith(
      2,
      'testnet:0.0.1002',
      expect.objectContaining({ name: 'NFT2', tokenId: '0.0.1002' }),
    );
  });
});

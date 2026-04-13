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
import { SupplyType, SupportedNetwork } from '@/core/types/shared.types';
import { TOKEN_CREATE_NFT_FROM_FILE_COMMAND_NAME } from '@/plugins/token/commands/create-nft-from-file';
import { TokenCreateNftFromFileStateHook } from '@/plugins/token/hooks/token-create-nft-from-file-state';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { mockAccountIds, validNftTokenFile } from './helpers/fixtures';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

jest.mock('../../utils/token-associations', () => ({
  processTokenAssociations: jest.fn().mockResolvedValue([]),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

const createFlatNormalizedParams = (
  overrides: Record<string, unknown> = {},
) => ({
  filename: 'nft.json',
  alias: validNftTokenFile.name,
  name: validNftTokenFile.name,
  symbol: validNftTokenFile.symbol,
  supplyType:
    validNftTokenFile.supplyType === 'finite'
      ? SupplyType.FINITE
      : SupplyType.INFINITE,
  maxSupply: validNftTokenFile.maxSupply
    ? BigInt(validNftTokenFile.maxSupply)
    : undefined,
  memo: validNftTokenFile.memo,
  associations: validNftTokenFile.associations,
  keyRefIds: [],
  keyManager: KeyManager.local,
  network: SupportedNetwork.TESTNET,
  treasury: {
    accountId: mockAccountIds.treasury,
    keyRefId: 'kr-treasury',
    publicKey: 'pk-treasury',
  },
  adminKey: { keyRefId: 'kr-admin', publicKey: 'pk-admin' },
  supplyKey: { keyRefId: 'kr-supply', publicKey: 'pk-supply' },
  ...overrides,
});

const createNftFromFileBatchDataItem = (
  overrides: Partial<BatchDataItem> = {},
): BatchDataItem => ({
  transactionBytes: 'abcdef1234567890',
  order: 1,
  keyRefIds: [],
  command: TOKEN_CREATE_NFT_FROM_FILE_COMMAND_NAME,
  normalizedParams: createFlatNormalizedParams(),
  transactionId: '0.0.1234@1234567890.000000000',
  ...overrides,
});

describe('token plugin - batch-create-nft-from-file hook', () => {
  let hook: TokenCreateNftFromFileStateHook;

  beforeEach(() => {
    jest.clearAllMocks();
    hook = new TokenCreateNftFromFileStateHook();
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
      transactions: [createNftFromFileBatchDataItem()],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
  });

  test('returns success when no token_create-nft-from-file transactions in batch', async () => {
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
          ...createNftFromFileBatchDataItem(),
          command: 'token_create-nft',
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
        createNftFromFileBatchDataItem({
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
      transactions: [
        createNftFromFileBatchDataItem({ transactionId: undefined }),
      ],
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
      transactions: [createNftFromFileBatchDataItem()],
    });

    await expect(hook.execute({ ...params, args })).rejects.toThrow(StateError);

    expect(getReceiptMock).toHaveBeenCalledWith({
      transactionId: '0.0.1234@1234567890.000000000',
    });
  });

  test('saves nft and registers alias when batch has valid token_create-nft-from-file item', async () => {
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
        createNftFromFileBatchDataItem({
          normalizedParams: createFlatNormalizedParams({
            alias: 'MyNFT',
            name: 'MyNFT',
            symbol: 'MNFT',
          }),
        }),
      ],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
    expect(saveTokenMock).toHaveBeenCalledWith(
      'testnet:0.0.9999',
      expect.objectContaining({
        tokenId: '0.0.9999',
        name: 'MyNFT',
        symbol: 'MNFT',
        treasuryId: mockAccountIds.treasury,
      }),
    );
    expect(registerMock).toHaveBeenCalledWith({
      alias: 'MyNFT',
      type: 'token',
      network: SupportedNetwork.TESTNET,
      entityId: '0.0.9999',
      createdAt: '2024-01-01T00:00:00.000Z',
    });
    expect(logger.info).toHaveBeenCalledWith(
      '   Non-fungible token data saved to state',
    );
    expect(logger.info).toHaveBeenCalledWith('   Name registered: MyNFT');
  });

  test('processes multiple token_create-nft-from-file items', async () => {
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
        createNftFromFileBatchDataItem({
          order: 1,
          transactionId: '0.0.1001@1234567890.000000000',
          normalizedParams: createFlatNormalizedParams({
            alias: 'NFT1',
            name: 'NFT1',
            symbol: 'NF1',
          }),
        }),
        createNftFromFileBatchDataItem({
          order: 2,
          transactionId: '0.0.1002@1234567890.000000001',
          normalizedParams: createFlatNormalizedParams({
            alias: 'NFT2',
            name: 'NFT2',
            symbol: 'NF2',
          }),
        }),
      ],
    });

    const result = await hook.execute({ ...params, args });

    expect(result.breakFlow).toBe(false);
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
    expect(registerMock).toHaveBeenCalledTimes(2);
  });

  test('warns and skips alias registration when alias already exists', async () => {
    const logger = makeLogger();
    const saveTokenMock = jest.fn();
    MockedHelper.mockImplementation(() => ({ saveToken: saveTokenMock }));

    const getReceiptMock = jest.fn().mockResolvedValue({
      tokenId: '0.0.9999',
      consensusTimestamp: '2024-01-01T00:00:00.000Z',
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
        createNftFromFileBatchDataItem({
          normalizedParams: createFlatNormalizedParams({ alias: 'my-alias' }),
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

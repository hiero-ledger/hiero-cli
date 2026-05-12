import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { BatchDataItem } from '@/core/types/shared.types';

import {
  createBatchExecuteParams,
  makeArgs,
  makeLogger,
  makeStateMock,
} from '@/__tests__/mocks/mocks';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { MirrorNodeTokenType } from '@/core/services/mirrornode/types';
import { SupportedNetwork } from '@/core/types/shared.types';
import { TOKEN_UPDATE_COMMAND_NAME } from '@/plugins/token/commands/update/handler';
import { TokenUpdateStateHook } from '@/plugins/token/hooks/token-update-state';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

jest.mock('@/plugins/token/zustand-state-helper');

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

const DEFAULT_TOKEN_INFO = {
  token_id: '0.0.123456',
  symbol: 'TEST',
  name: 'TestToken',
  decimals: '2',
  total_supply: '100000',
  max_supply: '0',
  type: MirrorNodeTokenType.FUNGIBLE_COMMON,
  treasury_account_id: '0.0.200000',
  created_timestamp: '2024-01-01T00:00:00.000Z',
  pause_status: 'NOT_APPLICABLE',
  memo: '',
};

const DEFAULT_NORMALIZED_PARAMS = {
  keyRefIds: ['admin-key-ref-id'],
  tokenId: '0.0.123456',
  tokenInfo: DEFAULT_TOKEN_INFO,
  stateKey: 'testnet:0.0.123456',
  network: SupportedNetwork.TESTNET,
  keyManager: KeyManager.local,
  isExpirationOnlyUpdate: false,
  adminKeyRefIds: ['admin-key-ref-id'],
  newAdminKeys: null,
  kycKeys: null,
  freezeKeys: null,
  wipeKeys: null,
  supplyKeys: null,
  feeScheduleKeys: null,
  pauseKeys: null,
  metadataKeys: null,
  newName: 'NewName',
};

const createUpdateBatchDataItem = (
  overrides: Partial<BatchDataItem> = {},
): BatchDataItem => ({
  transactionBytes: '0xabcdef',
  order: 1,
  command: TOKEN_UPDATE_COMMAND_NAME,
  keyRefIds: ['admin-key-ref-id'],
  normalizedParams: DEFAULT_NORMALIZED_PARAMS,
  transactionId: '0.0.123@1234567890.123456789',
  ...overrides,
});

describe('TokenUpdateStateHook', () => {
  let hook: TokenUpdateStateHook;
  let saveTokenMock: jest.Mock;
  let getTokenMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    hook = new TokenUpdateStateHook();
    saveTokenMock = jest.fn();
    getTokenMock = jest.fn().mockReturnValue(null);
    MockedHelper.mockImplementation(() => ({
      saveToken: saveTokenMock,
      getToken: getTokenMock,
    }));
  });

  describe('flow control', () => {
    test('returns breakFlow:false when source is not BATCH', async () => {
      const api = { state: makeStateMock() } as unknown as Partial<CoreApi>;
      const params = {
        ...createBatchExecuteParams({
          name: 'batch',
          keyRefId: 'kr',
          executed: true,
          success: true,
          transactions: [],
        }),
        executeTransactionResult: { source: 'OTHER' },
        args: makeArgs(api, makeLogger(), {}),
      };

      const result = await hook.execute(params as never);

      expect(result.breakFlow).toBe(false);
      expect(saveTokenMock).not.toHaveBeenCalled();
    });

    test('returns breakFlow:false when batchData.success is false', async () => {
      const api = { state: makeStateMock() } as unknown as Partial<CoreApi>;
      const args = makeArgs(api, makeLogger(), {});
      const params = createBatchExecuteParams(
        {
          name: 'batch',
          keyRefId: 'kr',
          executed: true,
          success: false,
          transactions: [createUpdateBatchDataItem()],
        },
        args,
      );

      const result = await hook.execute(params);

      expect(result.breakFlow).toBe(false);
      expect(saveTokenMock).not.toHaveBeenCalled();
    });

    test('returns breakFlow:false and skips when no token_update commands in batch', async () => {
      const api = { state: makeStateMock() } as unknown as Partial<CoreApi>;
      const args = makeArgs(api, makeLogger(), {});
      const params = createBatchExecuteParams(
        {
          name: 'batch',
          keyRefId: 'kr',
          executed: true,
          success: true,
          transactions: [
            createUpdateBatchDataItem({ command: 'token_create-ft' }),
          ],
        },
        args,
      );

      const result = await hook.execute(params);

      expect(result.breakFlow).toBe(false);
      expect(saveTokenMock).not.toHaveBeenCalled();
    });
  });

  describe('invalid params', () => {
    test('logs warn and skips when normalizedParams are invalid', async () => {
      const logger = makeLogger();
      const api = { state: makeStateMock() } as unknown as Partial<CoreApi>;
      const args = makeArgs(api, logger, {});
      const params = createBatchExecuteParams(
        {
          name: 'batch',
          keyRefId: 'kr',
          executed: true,
          success: true,
          transactions: [
            createUpdateBatchDataItem({
              normalizedParams: { invalid: 'data' },
            }),
          ],
        },
        args,
      );

      const result = await hook.execute(params);

      expect(result.breakFlow).toBe(false);
      expect(saveTokenMock).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'There was a problem with parsing data schema. The saving will not be done',
      );
    });
  });

  describe('successful state save', () => {
    test('saves token data with new name from normalizedParams', async () => {
      const api = { state: makeStateMock() } as unknown as Partial<CoreApi>;
      const args = makeArgs(api, makeLogger(), {});
      const params = createBatchExecuteParams(
        {
          name: 'batch',
          keyRefId: 'kr',
          executed: true,
          success: true,
          transactions: [
            createUpdateBatchDataItem({
              normalizedParams: {
                ...DEFAULT_NORMALIZED_PARAMS,
                newName: 'UpdatedName',
              },
            }),
          ],
        },
        args,
      );

      const result = await hook.execute(params);

      expect(result.breakFlow).toBe(false);
      expect(saveTokenMock).toHaveBeenCalledWith(
        'testnet:0.0.123456',
        expect.objectContaining({
          tokenId: '0.0.123456',
          name: 'UpdatedName',
          network: SupportedNetwork.TESTNET,
        }),
      );
    });

    test('falls back to tokenInfo name when newName is not set', async () => {
      const api = { state: makeStateMock() } as unknown as Partial<CoreApi>;
      const args = makeArgs(api, makeLogger(), {});
      const params = createBatchExecuteParams(
        {
          name: 'batch',
          keyRefId: 'kr',
          executed: true,
          success: true,
          transactions: [
            createUpdateBatchDataItem({
              normalizedParams: {
                ...DEFAULT_NORMALIZED_PARAMS,
                newName: undefined,
                memo: 'new memo',
              },
            }),
          ],
        },
        args,
      );

      await hook.execute(params);

      expect(saveTokenMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ name: DEFAULT_TOKEN_INFO.name }),
      );
    });

    test('uses existing state as fallback for unchanged fields', async () => {
      getTokenMock.mockReturnValue({
        tokenId: '0.0.123456',
        name: 'ExistingName',
        decimals: 6,
        initialSupply: 500000n,
        adminKeyRefIds: ['existing-admin-ref'],
        adminKeyThreshold: 1,
      });

      const api = { state: makeStateMock() } as unknown as Partial<CoreApi>;
      const args = makeArgs(api, makeLogger(), {});
      const params = createBatchExecuteParams(
        {
          name: 'batch',
          keyRefId: 'kr',
          executed: true,
          success: true,
          transactions: [
            createUpdateBatchDataItem({
              normalizedParams: {
                ...DEFAULT_NORMALIZED_PARAMS,
                newName: 'UpdatedName',
              },
            }),
          ],
        },
        args,
      );

      await hook.execute(params);

      expect(saveTokenMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          name: 'UpdatedName',
          decimals: 6,
          initialSupply: 500000n,
        }),
      );
    });

    test('clears kycKey when kycKeys is null', async () => {
      const api = { state: makeStateMock() } as unknown as Partial<CoreApi>;
      const args = makeArgs(api, makeLogger(), {});
      const params = createBatchExecuteParams(
        {
          name: 'batch',
          keyRefId: 'kr',
          executed: true,
          success: true,
          transactions: [
            createUpdateBatchDataItem({
              normalizedParams: {
                ...DEFAULT_NORMALIZED_PARAMS,
                kycKeys: null,
              },
            }),
          ],
        },
        args,
      );

      await hook.execute(params);

      expect(saveTokenMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ kycKeyRefIds: [] }),
      );
    });

    test('saves new kycKey refs when kycKeys are provided', async () => {
      const api = { state: makeStateMock() } as unknown as Partial<CoreApi>;
      const args = makeArgs(api, makeLogger(), {});
      const params = createBatchExecuteParams(
        {
          name: 'batch',
          keyRefId: 'kr',
          executed: true,
          success: true,
          transactions: [
            createUpdateBatchDataItem({
              normalizedParams: {
                ...DEFAULT_NORMALIZED_PARAMS,
                kycKeys: [{ keyRefId: 'kyc-ref-id', publicKey: 'kyc-pub-key' }],
              },
            }),
          ],
        },
        args,
      );

      await hook.execute(params);

      expect(saveTokenMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ kycKeyRefIds: ['kyc-ref-id'] }),
      );
    });

    test('updates treasury when newTreasuryId is set', async () => {
      const api = { state: makeStateMock() } as unknown as Partial<CoreApi>;
      const args = makeArgs(api, makeLogger(), {});
      const params = createBatchExecuteParams(
        {
          name: 'batch',
          keyRefId: 'kr',
          executed: true,
          success: true,
          transactions: [
            createUpdateBatchDataItem({
              normalizedParams: {
                ...DEFAULT_NORMALIZED_PARAMS,
                newTreasuryId: '0.0.999999',
              },
            }),
          ],
        },
        args,
      );

      await hook.execute(params);

      expect(saveTokenMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ treasuryId: '0.0.999999' }),
      );
    });

    test('logs info after saving token state', async () => {
      const logger = makeLogger();
      const api = { state: makeStateMock() } as unknown as Partial<CoreApi>;
      const args = makeArgs(api, logger, {});
      const params = createBatchExecuteParams(
        {
          name: 'batch',
          keyRefId: 'kr',
          executed: true,
          success: true,
          transactions: [createUpdateBatchDataItem()],
        },
        args,
      );

      await hook.execute(params);

      expect(logger.info).toHaveBeenCalledWith(
        '   Token update state saved for 0.0.123456',
      );
    });

    test('processes multiple token_update-ft items', async () => {
      const api = { state: makeStateMock() } as unknown as Partial<CoreApi>;
      const args = makeArgs(api, makeLogger(), {});
      const params = createBatchExecuteParams(
        {
          name: 'batch',
          keyRefId: 'kr',
          executed: true,
          success: true,
          transactions: [
            createUpdateBatchDataItem({
              order: 1,
              normalizedParams: {
                ...DEFAULT_NORMALIZED_PARAMS,
                tokenId: '0.0.111',
                stateKey: 'testnet:0.0.111',
                tokenInfo: { ...DEFAULT_TOKEN_INFO, token_id: '0.0.111' },
                newName: 'Token One',
              },
            }),
            createUpdateBatchDataItem({
              order: 2,
              normalizedParams: {
                ...DEFAULT_NORMALIZED_PARAMS,
                tokenId: '0.0.222',
                stateKey: 'testnet:0.0.222',
                tokenInfo: { ...DEFAULT_TOKEN_INFO, token_id: '0.0.222' },
                newName: 'Token Two',
              },
            }),
          ],
        },
        args,
      );

      await hook.execute(params);

      expect(saveTokenMock).toHaveBeenCalledTimes(2);
      expect(saveTokenMock).toHaveBeenNthCalledWith(
        1,
        'testnet:0.0.111',
        expect.objectContaining({ tokenId: '0.0.111', name: 'Token One' }),
      );
      expect(saveTokenMock).toHaveBeenNthCalledWith(
        2,
        'testnet:0.0.222',
        expect.objectContaining({ tokenId: '0.0.222', name: 'Token Two' }),
      );
    });

    test('ignores non-update commands in a mixed batch', async () => {
      const api = { state: makeStateMock() } as unknown as Partial<CoreApi>;
      const args = makeArgs(api, makeLogger(), {});
      const params = createBatchExecuteParams(
        {
          name: 'batch',
          keyRefId: 'kr',
          executed: true,
          success: true,
          transactions: [
            createUpdateBatchDataItem({ command: 'token_create-ft', order: 1 }),
            createUpdateBatchDataItem({ order: 2 }),
            createUpdateBatchDataItem({ command: 'token_delete', order: 3 }),
          ],
        },
        args,
      );

      await hook.execute(params);

      expect(saveTokenMock).toHaveBeenCalledTimes(1);
    });
  });
});

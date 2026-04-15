import type { Transaction } from '@hashgraph/sdk';
import type { CoreApi } from '@/core/core-api/core-api.interface';

import { PublicKey } from '@hashgraph/sdk';

import { makeLogger } from '@/__tests__/mocks/mocks';
import { NotFoundError, ValidationError } from '@/core/errors';
import { BatchifySetBatchKeyHook } from '@/plugins/batch/hooks/batchify-set-batch-key/handler';
import { ZustandBatchStateHelper } from '@/plugins/batch/zustand-state-helper';

import {
  BATCH_COMPOSED_KEY,
  BATCH_KEY_REF_ID,
  BATCH_NAME,
  BATCH_PUBLIC_KEY,
  mockBatchData,
  mockExecutedBatchData,
} from './helpers/fixtures';
import { makeArgs, makeBatchApiMocks } from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandBatchStateHelper: jest.fn(),
}));

const MockedHelper = ZustandBatchStateHelper as jest.Mock;

describe('batch plugin - BatchifySetBatchKeyHook', () => {
  let hook: BatchifySetBatchKeyHook;

  beforeEach(() => {
    jest.clearAllMocks();
    hook = new BatchifySetBatchKeyHook();
  });

  test('returns breakFlow false when batch CLI arg is absent', async () => {
    const logger = makeLogger();
    const { networkMock, kmsMock } = makeBatchApiMocks();
    const api: Partial<CoreApi> = { network: networkMock, kms: kmsMock };
    const args = makeArgs(api, logger, {});

    const setBatchKey = jest.fn();
    const transaction = { setBatchKey } as unknown as Transaction;

    const result = await hook.execute({
      args,
      commandName: 'token_mint-ft',
      normalisedParams: { keyRefIds: ['kr'] },
      buildTransactionResult: { transaction },
    });

    expect(result.breakFlow).toBe(false);
    expect(logger.debug).toHaveBeenCalledWith(
      'No parameter "batch" found. Transaction will not be added to batch.',
    );
    expect(setBatchKey).not.toHaveBeenCalled();
  });

  test('throws NotFoundError when batch does not exist in state', () => {
    const logger = makeLogger();
    const getBatchMock = jest.fn().mockReturnValue(null);
    MockedHelper.mockImplementation(() => ({
      getBatch: getBatchMock,
    }));

    const { networkMock, kmsMock } = makeBatchApiMocks();
    const api: Partial<CoreApi> = { network: networkMock, kms: kmsMock };
    const args = makeArgs(api, logger, { batch: BATCH_NAME });

    const transaction = {
      setBatchKey: jest.fn(),
    } as unknown as Transaction;

    expect(() =>
      hook.execute({
        args,
        commandName: 'account_create',
        normalisedParams: { keyRefIds: [] },
        buildTransactionResult: { transaction },
      }),
    ).toThrow(NotFoundError);

    expect(getBatchMock).toHaveBeenCalledWith(BATCH_COMPOSED_KEY);
  });

  test('throws ValidationError when batch was already executed', () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getBatch: jest.fn().mockReturnValue(mockExecutedBatchData),
    }));

    const { networkMock, kmsMock } = makeBatchApiMocks();
    const api: Partial<CoreApi> = { network: networkMock, kms: kmsMock };
    const args = makeArgs(api, logger, { batch: BATCH_NAME });

    const transaction = {
      setBatchKey: jest.fn(),
    } as unknown as Transaction;

    expect(() =>
      hook.execute({
        args,
        commandName: 'account_create',
        normalisedParams: { keyRefIds: [] },
        buildTransactionResult: { transaction },
      }),
    ).toThrow(ValidationError);
  });

  test('throws NotFoundError when batch key credential is missing from KMS', () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getBatch: jest.fn().mockReturnValue(mockBatchData),
    }));

    const { networkMock, kmsMock } = makeBatchApiMocks();
    kmsMock.get = jest.fn().mockReturnValue(undefined);

    const api: Partial<CoreApi> = { network: networkMock, kms: kmsMock };
    const args = makeArgs(api, logger, { batch: BATCH_NAME });

    const transaction = {
      setBatchKey: jest.fn(),
    } as unknown as Transaction;

    expect(() =>
      hook.execute({
        args,
        commandName: 'account_create',
        normalisedParams: { keyRefIds: [] },
        buildTransactionResult: { transaction },
      }),
    ).toThrow(NotFoundError);

    expect(kmsMock.get).toHaveBeenCalledWith(BATCH_KEY_REF_ID);
  });

  test('sets batch public key on transaction before signing', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getBatch: jest.fn().mockReturnValue(mockBatchData),
    }));

    const { networkMock, kmsMock } = makeBatchApiMocks();

    const api: Partial<CoreApi> = { network: networkMock, kms: kmsMock };
    const args = makeArgs(api, logger, { batch: BATCH_NAME });

    const setBatchKey = jest.fn();
    const transaction = { setBatchKey } as unknown as Transaction;

    const result = await hook.execute({
      args,
      commandName: 'token_delete',
      normalisedParams: { keyRefIds: ['kr'] },
      buildTransactionResult: { transaction },
    });

    expect(result.breakFlow).toBe(false);
    expect(setBatchKey).toHaveBeenCalledTimes(1);
    expect(setBatchKey).toHaveBeenCalledWith(
      PublicKey.fromString(BATCH_PUBLIC_KEY),
    );
  });
});

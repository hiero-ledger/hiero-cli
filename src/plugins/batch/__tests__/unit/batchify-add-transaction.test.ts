import type { Transaction } from '@hashgraph/sdk';
import type { CoreApi } from '@/core/core-api/core-api.interface';

import { makeLogger } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { NotFoundError, ValidationError } from '@/core/errors';
import { SupportedNetwork } from '@/core/types/shared.types';
import { BatchifyAddTransactionHook } from '@/plugins/batch/hooks/batchify-add-transaction/handler';
import { BatchifyOutputSchema } from '@/plugins/batch/hooks/batchify-add-transaction/output';
import { ZustandBatchStateHelper } from '@/plugins/batch/zustand-state-helper';

import {
  BATCH_COMPOSED_KEY,
  BATCH_NAME,
  mockBatchData,
  mockBatchDataWithTransactions,
} from './helpers/fixtures';
import { makeArgs, makeBatchApiMocks } from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandBatchStateHelper: jest.fn(),
}));

const MockedHelper = ZustandBatchStateHelper as jest.Mock;

describe('batch plugin - BatchifyAddTransactionHook', () => {
  let hook: BatchifyAddTransactionHook;

  beforeEach(() => {
    jest.clearAllMocks();
    hook = new BatchifyAddTransactionHook();
  });

  test('returns breakFlow false when batch CLI arg is absent', async () => {
    const logger = makeLogger();
    const { networkMock } = makeBatchApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, {});

    const signedTransaction = {
      toBytes: jest.fn().mockReturnValue(Buffer.from([0xde, 0xad])),
    } as unknown as Transaction;

    const result = await hook.execute({
      args,
      commandName: 'token_mint-ft',
      normalisedParams: { keyRefIds: ['kr-signer'] },
      buildTransactionResult: { transaction: {} as Transaction },
      signTransactionResult: { signedTransaction },
    });

    expect(result.breakFlow).toBe(false);
    expect(logger.debug).toHaveBeenCalledWith(
      'No parameter "batch" found. Transaction will not be added to batch.',
    );
  });

  test('throws NotFoundError when batch does not exist in state', () => {
    const logger = makeLogger();
    const getBatchMock = jest.fn().mockReturnValue(null);
    MockedHelper.mockImplementation(() => ({
      getBatch: getBatchMock,
      saveBatch: jest.fn(),
    }));

    const { networkMock } = makeBatchApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, { batch: BATCH_NAME });

    const signedTransaction = {
      toBytes: jest.fn().mockReturnValue(Buffer.from([1])),
    } as unknown as Transaction;

    expect(() =>
      hook.execute({
        args,
        commandName: 'account_create',
        normalisedParams: { keyRefIds: [] },
        buildTransactionResult: { transaction: {} as Transaction },
        signTransactionResult: { signedTransaction },
      }),
    ).toThrow(NotFoundError);

    expect(getBatchMock).toHaveBeenCalledWith(BATCH_COMPOSED_KEY);
  });

  test('throws ValidationError when batch already has maximum inner transactions', () => {
    const logger = makeLogger();
    const fullBatch = {
      ...mockBatchData,
      transactions: Array.from(
        { length: BatchifyAddTransactionHook.BATCH_MAXIMUM_SIZE },
        (_, i) => ({
          transactionBytes: 'aa',
          order: i + 1,
          command: 'noop',
          normalizedParams: {},
          keyRefIds: [] as string[],
        }),
      ),
    };
    MockedHelper.mockImplementation(() => ({
      getBatch: jest.fn().mockReturnValue(fullBatch),
      saveBatch: jest.fn(),
    }));

    const { networkMock } = makeBatchApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, { batch: BATCH_NAME });

    const signedTransaction = {
      toBytes: jest.fn().mockReturnValue(Buffer.from([1])),
    } as unknown as Transaction;

    expect(() =>
      hook.execute({
        args,
        commandName: 'account_create',
        normalisedParams: { keyRefIds: [] },
        buildTransactionResult: { transaction: {} as Transaction },
        signTransactionResult: { signedTransaction },
      }),
    ).toThrow(ValidationError);
  });

  test('appends transaction, persists batch, and returns breakFlow output', async () => {
    const logger = makeLogger();
    const saveBatchMock = jest.fn();
    const batchSnapshot = structuredClone(mockBatchData);
    MockedHelper.mockImplementation(() => ({
      getBatch: jest.fn().mockReturnValue(batchSnapshot),
      saveBatch: saveBatchMock,
    }));

    const { networkMock } = makeBatchApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, { batch: BATCH_NAME });

    const bytes = Buffer.from([0x01, 0x02, 0x03]);
    const signedTransaction = {
      toBytes: jest.fn().mockReturnValue(bytes),
    } as unknown as Transaction;

    const keyRefIds = ['kr-a', 'kr-b'];
    const normalisedParams = {
      keyRefIds,
      network: SupportedNetwork.TESTNET,
      foo: 'bar',
    };

    const result = await hook.execute({
      args,
      commandName: 'token_delete',
      normalisedParams,
      buildTransactionResult: { transaction: {} as Transaction },
      signTransactionResult: { signedTransaction },
    });

    expect(result.breakFlow).toBe(true);
    if (!('result' in result)) {
      throw new Error('expected breakFlow result');
    }
    const output = assertOutput(result.result, BatchifyOutputSchema);
    expect(output.batchName).toBe(BATCH_NAME);
    expect(output.transactionOrder).toBe(1);

    expect(saveBatchMock).toHaveBeenCalledTimes(1);
    const [, saved] = saveBatchMock.mock.calls[0];
    expect(saved.transactions).toHaveLength(1);
    expect(saved.transactions[0]).toMatchObject({
      order: 1,
      command: 'token_delete',
      transactionBytes: bytes.toString('hex'),
      keyRefIds,
      normalizedParams: normalisedParams,
    });

    expect(logger.info).toHaveBeenCalledWith(
      `Transaction added to batch '${BATCH_NAME}' at position 1`,
    );
  });

  test('assigns next order after highest existing transaction order', async () => {
    const logger = makeLogger();
    const saveBatchMock = jest.fn();
    const batchSnapshot = structuredClone(mockBatchDataWithTransactions);
    MockedHelper.mockImplementation(() => ({
      getBatch: jest.fn().mockReturnValue(batchSnapshot),
      saveBatch: saveBatchMock,
    }));

    const { networkMock } = makeBatchApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, { batch: BATCH_NAME });

    const signedTransaction = {
      toBytes: jest.fn().mockReturnValue(Buffer.from([9])),
    } as unknown as Transaction;

    const result = await hook.execute({
      args,
      commandName: 'account_create',
      normalisedParams: { keyRefIds: ['kr'] },
      buildTransactionResult: { transaction: {} as Transaction },
      signTransactionResult: { signedTransaction },
    });

    expect(result.breakFlow).toBe(true);
    if (!('result' in result)) {
      throw new Error('expected breakFlow result');
    }
    const output = assertOutput(result.result, BatchifyOutputSchema);
    expect(output.transactionOrder).toBe(3);

    const [, saved] = saveBatchMock.mock.calls[0];
    expect(saved.transactions).toHaveLength(3);
    expect(saved.transactions[2].order).toBe(3);
  });
});

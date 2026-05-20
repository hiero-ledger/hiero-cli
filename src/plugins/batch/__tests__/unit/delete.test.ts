import type { CoreApi } from '@/core/core-api/core-api.interface';

import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { NotFoundError } from '@/core/errors';
import {
  BatchDeleteCommand,
  BatchDeleteOutputSchema,
} from '@/plugins/batch/commands/delete';

import {
  BATCH_NAME,
  mockBatchData,
  mockBatchDataWithTransactions,
} from './helpers/fixtures';
import { makeBatchApiMocks, makeBatchStateServiceMock } from './helpers/mocks';

describe('batch plugin - delete command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deletes whole batch successfully', async () => {
    const logger = makeLogger();
    const deleteBatchMock = jest.fn();
    const batchState = makeBatchStateServiceMock({
      getBatch: jest.fn().mockReturnValue({ ...mockBatchData }),
      deleteBatch: deleteBatchMock,
    });

    const { networkMock } = makeBatchApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };

    const args = makeArgs(api, logger, { name: BATCH_NAME });
    const result = await new BatchDeleteCommand(batchState).execute(args);

    expect(deleteBatchMock).toHaveBeenCalled();

    const output = assertOutput(result.result, BatchDeleteOutputSchema);
    expect(output.name).toBe(BATCH_NAME);
    expect(output.order).toBeUndefined();
  });

  test('deletes single transaction by order', async () => {
    const logger = makeLogger();
    const saveBatchMock = jest.fn();
    const batchCopy = {
      ...mockBatchDataWithTransactions,
      transactions: [...mockBatchDataWithTransactions.transactions],
    };
    const batchState = makeBatchStateServiceMock({
      getBatch: jest.fn().mockReturnValue(batchCopy),
      saveBatch: saveBatchMock,
    });

    const { networkMock } = makeBatchApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };

    const args = makeArgs(api, logger, { name: BATCH_NAME, order: 1 });
    const result = await new BatchDeleteCommand(batchState).execute(args);

    expect(saveBatchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        transactions: expect.arrayContaining([
          expect.objectContaining({ order: 2 }),
        ]),
      }),
    );

    const output = assertOutput(result.result, BatchDeleteOutputSchema);
    expect(output.name).toBe(BATCH_NAME);
    expect(output.order).toBe(1);
  });

  test('throws NotFoundError when batch does not exist', async () => {
    const logger = makeLogger();
    const batchState = makeBatchStateServiceMock({
      getBatch: jest.fn().mockReturnValue(null),
    });

    const { networkMock } = makeBatchApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };

    const args = makeArgs(api, logger, { name: BATCH_NAME });

    await expect(
      new BatchDeleteCommand(batchState).execute(args),
    ).rejects.toThrow(NotFoundError);
  });

  test('throws NotFoundError when transaction order not found', async () => {
    const logger = makeLogger();
    const batchState = makeBatchStateServiceMock({
      getBatch: jest.fn().mockReturnValue({
        ...mockBatchDataWithTransactions,
        transactions: [...mockBatchDataWithTransactions.transactions],
      }),
    });

    const { networkMock } = makeBatchApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };

    const args = makeArgs(api, logger, { name: BATCH_NAME, order: 999 });

    await expect(
      new BatchDeleteCommand(batchState).execute(args),
    ).rejects.toThrow(NotFoundError);
  });
});

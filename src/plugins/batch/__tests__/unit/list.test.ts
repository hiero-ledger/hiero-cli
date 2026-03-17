import type { CoreApi } from '@/core/core-api/core-api.interface';

import { makeLogger } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import {
  batchList,
  BatchListOutputSchema,
} from '@/plugins/batch/commands/list';
import { ZustandBatchStateHelper } from '@/plugins/batch/zustand-state-helper';

import {
  BATCH_KEY_REF_ID,
  BATCH_NAME,
  BATCH_PUBLIC_KEY,
  mockBatchData,
  mockBatchDataWithTransactions,
  mockExecutedBatchData,
} from './helpers/fixtures';
import { makeArgs, makeBatchApiMocks } from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandBatchStateHelper: jest.fn(),
}));

const MockedHelper = ZustandBatchStateHelper as jest.Mock;

describe('batch plugin - list command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns empty list when no batches exist', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      listBatches: jest.fn().mockReturnValue([]),
    }));

    const { networkMock, kmsMock } = makeBatchApiMocks();
    const api: Partial<CoreApi> = { network: networkMock, kms: kmsMock };

    const args = makeArgs(api, logger, {});
    const result = await batchList(args);

    const output = assertOutput(result.result, BatchListOutputSchema);
    expect(output.batches).toHaveLength(0);
    expect(output.totalCount).toBe(0);
  });

  test('lists batches with correct data', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      listBatches: jest
        .fn()
        .mockReturnValue([mockBatchData, mockBatchDataWithTransactions]),
    }));

    const { networkMock, kmsMock } = makeBatchApiMocks();
    const api: Partial<CoreApi> = { network: networkMock, kms: kmsMock };

    const args = makeArgs(api, logger, {});
    const result = await batchList(args);

    const output = assertOutput(result.result, BatchListOutputSchema);
    expect(output.batches).toHaveLength(2);
    expect(output.totalCount).toBe(2);
    expect(output.batches[0].name).toBe(BATCH_NAME);
    expect(output.batches[0].transactionCount).toBe(0);
    expect(output.batches[0].executed).toBe(false);
    expect(output.batches[0].success).toBe(false);
    expect(output.batches[1].transactionCount).toBe(2);
  });

  test('shows batch key from kms', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      listBatches: jest.fn().mockReturnValue([mockBatchData]),
    }));

    const { networkMock, kmsMock } = makeBatchApiMocks();
    const api: Partial<CoreApi> = { network: networkMock, kms: kmsMock };

    const args = makeArgs(api, logger, {});
    const result = await batchList(args);

    const output = assertOutput(result.result, BatchListOutputSchema);
    expect(output.batches[0].batchKey).toBe(BATCH_PUBLIC_KEY);
    expect(kmsMock.get).toHaveBeenCalledWith(BATCH_KEY_REF_ID);
  });

  test('shows executed batch status', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      listBatches: jest.fn().mockReturnValue([mockExecutedBatchData]),
    }));

    const { networkMock, kmsMock } = makeBatchApiMocks();
    const api: Partial<CoreApi> = { network: networkMock, kms: kmsMock };

    const args = makeArgs(api, logger, {});
    const result = await batchList(args);

    const output = assertOutput(result.result, BatchListOutputSchema);
    expect(output.batches[0].executed).toBe(true);
    expect(output.batches[0].success).toBe(true);
  });

  test('handles missing kms key gracefully', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      listBatches: jest.fn().mockReturnValue([mockBatchData]),
    }));

    const { networkMock, kmsMock } = makeBatchApiMocks();
    kmsMock.get = jest.fn().mockReturnValue(undefined);
    const api: Partial<CoreApi> = { network: networkMock, kms: kmsMock };

    const args = makeArgs(api, logger, {});
    const result = await batchList(args);

    const output = assertOutput(result.result, BatchListOutputSchema);
    expect(output.batches[0].batchKey).toBeUndefined();
  });
});

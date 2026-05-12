import type { CoreApi } from '@/core/core-api/core-api.interface';

import { assertOutput } from '@/__tests__/utils/assert-output';
import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';
import { swapList } from '@/plugins/swap/commands/list/handler';
import { SwapListOutputSchema } from '@/plugins/swap/commands/list/output';
import { SwapStateHelper } from '@/plugins/swap/state-helper';

import {
  mockEmptySwap,
  mockSwapWithHbar,
  mockSwapWithMultipleTransfers,
  SWAP_MEMO,
  SWAP_NAME,
} from './helpers/fixtures';
import { makeArgs, makeLogger, makeSwapApiMocks } from './helpers/mocks';

jest.mock('../../state-helper', () => ({
  SwapStateHelper: jest.fn(),
}));

const MockedHelper = SwapStateHelper as jest.Mock;

describe('swap plugin - list command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns empty list when no swaps exist', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      listSwaps: jest.fn().mockReturnValue([]),
    }));

    const { networkMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, {});

    const result = await swapList(args);

    const output = assertOutput(result.result, SwapListOutputSchema);
    expect(output.totalCount).toBe(0);
    expect(output.swaps).toHaveLength(0);
  });

  test('returns all saved swaps with correct count', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      listSwaps: jest.fn().mockReturnValue([
        { name: SWAP_NAME, entry: mockSwapWithHbar },
        { name: 'second-swap', entry: mockSwapWithMultipleTransfers },
      ]),
    }));

    const { networkMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, {});

    const result = await swapList(args);

    const output = assertOutput(result.result, SwapListOutputSchema);
    expect(output.totalCount).toBe(2);
    expect(output.swaps).toHaveLength(2);
  });

  test('maps swap name, transferCount and maxTransfers correctly', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      listSwaps: jest
        .fn()
        .mockReturnValue([{ name: SWAP_NAME, entry: mockSwapWithHbar }]),
    }));

    const { networkMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, {});

    const result = await swapList(args);

    const output = assertOutput(result.result, SwapListOutputSchema);
    const swap = output.swaps[0];
    expect(swap.name).toBe(SWAP_NAME);
    expect(swap.transferCount).toBe(1);
    expect(swap.maxTransfers).toBe(HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION);
  });

  test('includes memo when present', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      listSwaps: jest
        .fn()
        .mockReturnValue([
          { name: SWAP_NAME, entry: mockSwapWithMultipleTransfers },
        ]),
    }));

    const { networkMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, {});

    const result = await swapList(args);

    const output = assertOutput(result.result, SwapListOutputSchema);
    expect(output.swaps[0].memo).toBe(SWAP_MEMO);
  });

  test('omits memo when not set', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      listSwaps: jest
        .fn()
        .mockReturnValue([{ name: SWAP_NAME, entry: mockEmptySwap }]),
    }));

    const { networkMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, {});

    const result = await swapList(args);

    const output = assertOutput(result.result, SwapListOutputSchema);
    expect(output.swaps[0].memo).toBeUndefined();
  });
});

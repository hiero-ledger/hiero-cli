import type { CoreApi } from '@/core/core-api/core-api.interface';

import {
  MOCK_ACCOUNT_ID,
  MOCK_ACCOUNT_ID_ALT,
} from '@/__tests__/mocks/fixtures';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';
import { swapList } from '@/plugins/swap/commands/list/handler';
import { SwapListOutputSchema } from '@/plugins/swap/commands/list/output';
import { SwapTransferType } from '@/plugins/swap/schema';
import {
  formatAccount,
  formatToken,
  SwapStateHelper,
} from '@/plugins/swap/state-helper';

import {
  FROM_ACCOUNT_INPUT,
  HBAR_AMOUNT,
  mockSwapWithHbar,
  mockSwapWithMultipleTransfers,
  NFT_SERIALS,
  SWAP_MEMO,
  SWAP_NAME,
  TOKEN_INPUT,
} from './helpers/fixtures';
import { makeArgs, makeLogger, makeSwapApiMocks } from './helpers/mocks';

jest.mock('../../state-helper', () => ({
  SwapStateHelper: jest.fn(),
  formatAccount: jest.fn((input: string, accountId: string) =>
    input !== accountId ? `${input} (${accountId})` : accountId,
  ),
  formatToken: jest.fn((input: string, tokenId: string) =>
    input !== tokenId ? `${input} (${tokenId})` : tokenId,
  ),
}));

const MockedHelper = SwapStateHelper as jest.Mock;
const mockedFormatAccount = formatAccount as jest.Mock;
const mockedFormatToken = formatToken as jest.Mock;

describe('swap plugin - list command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFormatAccount.mockImplementation(
      (input: string, accountId: string) =>
        input !== accountId ? `${input} (${accountId})` : accountId,
    );
    mockedFormatToken.mockImplementation((input: string, tokenId: string) =>
      input !== tokenId ? `${input} (${tokenId})` : tokenId,
    );
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

  test('maps HBAR transfer to display format with correct fields', async () => {
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
    expect(swap.transfers[0].index).toBe(1);
    expect(swap.transfers[0].type).toBe(SwapTransferType.HBAR);
    expect(swap.transfers[0].from).toBe(
      `${FROM_ACCOUNT_INPUT} (${MOCK_ACCOUNT_ID})`,
    );
    expect(swap.transfers[0].to).toBe(MOCK_ACCOUNT_ID_ALT);
    expect(swap.transfers[0].detail).toBe(HBAR_AMOUNT);
  });

  test('maps all three transfer types in a multi-transfer swap', async () => {
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
    const swap = output.swaps[0];
    expect(swap.memo).toBe(SWAP_MEMO);
    expect(swap.transferCount).toBe(3);
    expect(swap.transfers).toHaveLength(3);

    const [hbar, ft, nft] = swap.transfers;
    expect(hbar.type).toBe(SwapTransferType.HBAR);
    expect(ft.type).toBe(SwapTransferType.FT);
    expect(ft.detail).toContain(TOKEN_INPUT);
    expect(nft.type).toBe(SwapTransferType.NFT);
    expect(nft.detail).toContain(NFT_SERIALS.join(', '));
  });

  test('assigns sequential 1-based index to each transfer', async () => {
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
    const { transfers } = output.swaps[0];
    expect(transfers[0].index).toBe(1);
    expect(transfers[1].index).toBe(2);
    expect(transfers[2].index).toBe(3);
  });
});

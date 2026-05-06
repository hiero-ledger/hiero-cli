import type { CoreApi } from '@/core/core-api/core-api.interface';

import {
  MOCK_ACCOUNT_ID,
  MOCK_ACCOUNT_ID_ALT,
  MOCK_HEDERA_ENTITY_ID_1,
} from '@/__tests__/mocks/fixtures';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { NotFoundError } from '@/core/errors';
import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';
import { swapView } from '@/plugins/swap/commands/view/handler';
import { SwapViewOutputSchema } from '@/plugins/swap/commands/view/output';
import { SwapTransferType } from '@/plugins/swap/schema';
import { SwapStateHelper } from '@/plugins/swap/state-helper';

import {
  HBAR_AMOUNT_STORED,
  mockSwapWithHbar,
  mockSwapWithMultipleTransfers,
  NFT_SERIALS,
  SWAP_MEMO,
  SWAP_NAME,
} from './helpers/fixtures';
import { makeArgs, makeLogger, makeSwapApiMocks } from './helpers/mocks';

jest.mock('../../state-helper', () => ({
  SwapStateHelper: jest.fn(),
}));

const MockedHelper = SwapStateHelper as jest.Mock;

describe('swap plugin - view command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns swap name, memo, transferCount, and maxTransfers', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getSwapOrThrow: jest.fn().mockReturnValue(mockSwapWithMultipleTransfers),
    }));

    const { networkMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    const result = await swapView(args);

    const output = assertOutput(result.result, SwapViewOutputSchema);
    expect(output.name).toBe(SWAP_NAME);
    expect(output.memo).toBe(SWAP_MEMO);
    expect(output.transferCount).toBe(3);
    expect(output.maxTransfers).toBe(
      HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION,
    );
  });

  test('maps HBAR transfer to display format with correct fields', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getSwapOrThrow: jest.fn().mockReturnValue(mockSwapWithHbar),
    }));

    const { networkMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    const result = await swapView(args);

    const output = assertOutput(result.result, SwapViewOutputSchema);
    const transfer = output.transfers[0];
    expect(transfer.index).toBe(1);
    expect(transfer.type).toBe(SwapTransferType.HBAR);
    expect(transfer.from).toBe(MOCK_ACCOUNT_ID);
    expect(transfer.to).toBe(MOCK_ACCOUNT_ID_ALT);
    expect(transfer.detail).toBe(HBAR_AMOUNT_STORED);
  });

  test('maps all three transfer types in a multi-transfer swap', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getSwapOrThrow: jest.fn().mockReturnValue(mockSwapWithMultipleTransfers),
    }));

    const { networkMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    const result = await swapView(args);

    const output = assertOutput(result.result, SwapViewOutputSchema);
    const [hbar, ft, nft] = output.transfers;
    expect(hbar.type).toBe(SwapTransferType.HBAR);
    expect(ft.type).toBe(SwapTransferType.FT);
    expect(ft.detail).toContain(MOCK_HEDERA_ENTITY_ID_1);
    expect(nft.type).toBe(SwapTransferType.NFT);
    expect(nft.detail).toContain(NFT_SERIALS.join(', '));
  });

  test('assigns sequential 1-based index to each transfer', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getSwapOrThrow: jest.fn().mockReturnValue(mockSwapWithMultipleTransfers),
    }));

    const { networkMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    const result = await swapView(args);

    const output = assertOutput(result.result, SwapViewOutputSchema);
    expect(output.transfers[0].index).toBe(1);
    expect(output.transfers[1].index).toBe(2);
    expect(output.transfers[2].index).toBe(3);
  });

  test('throws NotFoundError when swap does not exist', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getSwapOrThrow: jest.fn().mockImplementation(() => {
        throw new NotFoundError(
          `Swap "${SWAP_NAME}" not found. Create it first with: hcli swap create -n ${SWAP_NAME}`,
        );
      }),
    }));

    const { networkMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    await expect(swapView(args)).rejects.toThrow(NotFoundError);
  });
});

import type { CoreApi } from '@/core/core-api/core-api.interface';

import { assertOutput } from '@/__tests__/utils/assert-output';
import { NotFoundError } from '@/core/errors';
import { swapDelete } from '@/plugins/swap/commands/delete/handler';
import { SwapDeleteOutputSchema } from '@/plugins/swap/commands/delete/output';
import { SwapStateHelper } from '@/plugins/swap/state-helper';

import { mockSwapWithHbar, SWAP_NAME } from './helpers/fixtures';
import { makeArgs, makeLogger, makeSwapApiMocks } from './helpers/mocks';

jest.mock('../../state-helper', () => ({
  SwapStateHelper: jest.fn(),
}));

const MockedHelper = SwapStateHelper as jest.Mock;

describe('swap plugin - delete command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deletes an existing swap successfully', async () => {
    const logger = makeLogger();
    const deleteSwapMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getSwapOrThrow: jest.fn().mockReturnValue(mockSwapWithHbar),
      deleteSwap: deleteSwapMock,
    }));

    const { networkMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    const result = await swapDelete(args);

    expect(deleteSwapMock).toHaveBeenCalled();

    const output = assertOutput(result.result, SwapDeleteOutputSchema);
    expect(output.name).toBe(SWAP_NAME);
  });

  test('verifies the swap exists before deleting', async () => {
    const logger = makeLogger();
    const getSwapOrThrowMock = jest.fn().mockReturnValue(mockSwapWithHbar);
    MockedHelper.mockImplementation(() => ({
      getSwapOrThrow: getSwapOrThrowMock,
      deleteSwap: jest.fn(),
    }));

    const { networkMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    await swapDelete(args);

    expect(getSwapOrThrowMock).toHaveBeenCalledWith(SWAP_NAME);
  });

  test('throws NotFoundError when swap does not exist', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getSwapOrThrow: jest.fn().mockImplementation(() => {
        throw new NotFoundError(
          `Swap "${SWAP_NAME}" not found. Create it first with: hcli swap create -n ${SWAP_NAME}`,
        );
      }),
      deleteSwap: jest.fn(),
    }));

    const { networkMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    await expect(swapDelete(args)).rejects.toThrow(NotFoundError);
  });

  test('does not attempt delete when swap is not found', async () => {
    const logger = makeLogger();
    const deleteSwapMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getSwapOrThrow: jest.fn().mockImplementation(() => {
        throw new NotFoundError(`Swap "${SWAP_NAME}" not found.`);
      }),
      deleteSwap: deleteSwapMock,
    }));

    const { networkMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    await expect(swapDelete(args)).rejects.toThrow(NotFoundError);
    expect(deleteSwapMock).not.toHaveBeenCalled();
  });
});

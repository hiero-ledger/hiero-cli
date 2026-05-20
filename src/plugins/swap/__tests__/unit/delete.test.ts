import type { CoreApi } from '@/core/core-api/core-api.interface';

import { makeArgs, makeLogger } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { NotFoundError } from '@/core/errors';
import { swapDelete } from '@/plugins/swap/commands/delete/handler';
import { SwapDeleteOutputSchema } from '@/plugins/swap/commands/delete/output';
import { SwapStateServiceImpl } from '@/plugins/swap/services/swap-state.service';

import { SWAP_NAME } from './helpers/fixtures';
import { makeSwapApiMocks } from './helpers/mocks';

jest.mock('../../services/swap-state.service', () => ({
  SwapStateServiceImpl: jest.fn(),
}));

const MockedSwapStateService = SwapStateServiceImpl as jest.Mock;

describe('swap plugin - delete command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deletes an existing swap successfully', async () => {
    const logger = makeLogger();
    const deleteSwapMock = jest.fn();
    MockedSwapStateService.mockImplementation(() => ({
      exists: jest.fn().mockReturnValue(true),
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
    const existsMock = jest.fn().mockReturnValue(true);
    MockedSwapStateService.mockImplementation(() => ({
      exists: existsMock,
      deleteSwap: jest.fn(),
    }));

    const { networkMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    await swapDelete(args);

    expect(existsMock).toHaveBeenCalledWith(SWAP_NAME);
  });

  test('throws NotFoundError when swap does not exist', async () => {
    const logger = makeLogger();
    MockedSwapStateService.mockImplementation(() => ({
      exists: jest.fn().mockReturnValue(false),
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
    MockedSwapStateService.mockImplementation(() => ({
      exists: jest.fn().mockReturnValue(false),
      deleteSwap: deleteSwapMock,
    }));

    const { networkMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    await expect(swapDelete(args)).rejects.toThrow(NotFoundError);
    expect(deleteSwapMock).not.toHaveBeenCalled();
  });
});

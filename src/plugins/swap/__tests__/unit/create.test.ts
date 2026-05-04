import type { CoreApi } from '@/core/core-api/core-api.interface';

import { assertOutput } from '@/__tests__/utils/assert-output';
import { ValidationError } from '@/core/errors';
import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';
import { swapCreate } from '@/plugins/swap/commands/create/handler';
import { SwapCreateOutputSchema } from '@/plugins/swap/commands/create/output';
import { SwapStateHelper } from '@/plugins/swap/state-helper';

import { SWAP_MEMO, SWAP_NAME } from './helpers/fixtures';
import { makeArgs, makeLogger, makeSwapApiMocks } from './helpers/mocks';

jest.mock('../../state-helper', () => ({
  SwapStateHelper: jest.fn(),
}));

const MockedHelper = SwapStateHelper as jest.Mock;

describe('swap plugin - create command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates a new swap with empty transfers', async () => {
    const logger = makeLogger();
    const saveSwapMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      assertDoesNotExist: jest.fn(),
      saveSwap: saveSwapMock,
    }));

    const { networkMock, configMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock, config: configMock };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    const result = await swapCreate(args);

    expect(saveSwapMock).toHaveBeenCalledWith(
      SWAP_NAME,
      expect.objectContaining({ transfers: [] }),
    );

    const output = assertOutput(result.result, SwapCreateOutputSchema);
    expect(output.name).toBe(SWAP_NAME);
    expect(output.transferCount).toBe(0);
    expect(output.maxTransfers).toBe(
      HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION,
    );
    expect(output.memo).toBeUndefined();
  });

  test('creates a new swap with memo', async () => {
    const logger = makeLogger();
    const saveSwapMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      assertDoesNotExist: jest.fn(),
      saveSwap: saveSwapMock,
    }));

    const { networkMock, configMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock, config: configMock };
    const args = makeArgs(api, logger, { name: SWAP_NAME, memo: SWAP_MEMO });

    const result = await swapCreate(args);

    expect(saveSwapMock).toHaveBeenCalledWith(
      SWAP_NAME,
      expect.objectContaining({ memo: SWAP_MEMO, transfers: [] }),
    );

    const output = assertOutput(result.result, SwapCreateOutputSchema);
    expect(output.name).toBe(SWAP_NAME);
    expect(output.memo).toBe(SWAP_MEMO);
  });

  test('throws ValidationError when a swap with the same name already exists', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      assertDoesNotExist: jest.fn().mockImplementation(() => {
        throw new ValidationError(`Swap "${SWAP_NAME}" already exists.`);
      }),
      saveSwap: jest.fn(),
    }));

    const { networkMock, configMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock, config: configMock };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    await expect(swapCreate(args)).rejects.toThrow(ValidationError);
  });

  test('does not save swap when name already exists', async () => {
    const logger = makeLogger();
    const saveSwapMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      assertDoesNotExist: jest.fn().mockImplementation(() => {
        throw new ValidationError(`Swap "${SWAP_NAME}" already exists.`);
      }),
      saveSwap: saveSwapMock,
    }));

    const { networkMock, configMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock, config: configMock };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    await expect(swapCreate(args)).rejects.toThrow(ValidationError);
    expect(saveSwapMock).not.toHaveBeenCalled();
  });
});

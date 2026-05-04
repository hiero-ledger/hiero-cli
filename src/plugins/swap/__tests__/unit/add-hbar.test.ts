import type { KeyResolverService } from '@/core';
import type { CoreApi } from '@/core/core-api/core-api.interface';

import {
  MOCK_ACCOUNT_ID,
  MOCK_ACCOUNT_ID_ALT,
} from '@/__tests__/mocks/fixtures';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { NotFoundError, ValidationError } from '@/core/errors';
import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';
import { swapAddHbar } from '@/plugins/swap/commands/add-hbar/handler';
import { SwapAddHbarOutputSchema } from '@/plugins/swap/commands/add-hbar/output';
import { SwapTransferType } from '@/plugins/swap/schema';
import { formatAccount, SwapStateHelper } from '@/plugins/swap/state-helper';
import { resolveDestinationAccountParameter } from '@/plugins/token/resolver-helper';

import {
  FROM_ACCOUNT_INPUT,
  FROM_KEY_REF_ID,
  HBAR_AMOUNT,
  mockEmptySwap,
  SWAP_NAME,
} from './helpers/fixtures';
import { makeArgs, makeLogger, makeSwapApiMocks } from './helpers/mocks';

jest.mock('../../state-helper', () => ({
  SwapStateHelper: jest.fn(),
  formatAccount: jest.fn((input: string, accountId: string) =>
    input !== accountId ? `${input} (${accountId})` : accountId,
  ),
}));

jest.mock('@/plugins/token/resolver-helper', () => ({
  resolveDestinationAccountParameter: jest.fn(),
  resolveTokenParameter: jest.fn(),
}));

const MockedHelper = SwapStateHelper as jest.Mock;
const mockedFormatAccount = formatAccount as jest.Mock;
const mockedResolveDestination =
  resolveDestinationAccountParameter as jest.Mock;

describe('swap plugin - add-hbar command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedResolveDestination.mockReturnValue({
      accountId: MOCK_ACCOUNT_ID_ALT,
    });
    mockedFormatAccount.mockImplementation(
      (input: string, accountId: string) =>
        input !== accountId ? `${input} (${accountId})` : accountId,
    );
  });

  test('adds HBAR transfer with explicit from account (alias)', async () => {
    const logger = makeLogger();
    const addTransferMock = jest
      .fn()
      .mockReturnValue({ ...mockEmptySwap, transfers: [{}] });
    MockedHelper.mockImplementation(() => ({
      assertCanAdd: jest.fn(),
      addTransfer: addTransferMock,
    }));

    const resolveAccountCredentialsMock = jest.fn().mockResolvedValue({
      accountId: MOCK_ACCOUNT_ID,
      keyRefId: FROM_KEY_REF_ID,
      publicKey: 'test-public-key',
    });

    const { networkMock, configMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = {
      network: networkMock,
      config: configMock,
      keyResolver: {
        resolveAccountCredentials: resolveAccountCredentialsMock,
      } as unknown as KeyResolverService,
    };
    const args = makeArgs(api, logger, {
      name: SWAP_NAME,
      from: FROM_ACCOUNT_INPUT,
      to: MOCK_ACCOUNT_ID_ALT,
      amount: HBAR_AMOUNT,
    });

    const result = await swapAddHbar(args);

    expect(addTransferMock).toHaveBeenCalledWith(
      SWAP_NAME,
      expect.objectContaining({
        type: SwapTransferType.HBAR,
        from: expect.objectContaining({
          input: FROM_ACCOUNT_INPUT,
          accountId: MOCK_ACCOUNT_ID,
          keyRefId: FROM_KEY_REF_ID,
        }),
        to: expect.objectContaining({ accountId: MOCK_ACCOUNT_ID_ALT }),
        amount: HBAR_AMOUNT,
      }),
    );

    const output = assertOutput(result.result, SwapAddHbarOutputSchema);
    expect(output.swapName).toBe(SWAP_NAME);
    expect(output.amount).toBe(HBAR_AMOUNT);
    expect(output.transferCount).toBe(1);
    expect(output.maxTransfers).toBe(
      HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION,
    );
  });

  test('falls back to operator when from is not specified', async () => {
    const logger = makeLogger();
    const addTransferMock = jest
      .fn()
      .mockReturnValue({ ...mockEmptySwap, transfers: [{}] });
    MockedHelper.mockImplementation(() => ({
      assertCanAdd: jest.fn(),
      addTransfer: addTransferMock,
    }));

    const resolveAccountCredentialsMock = jest.fn().mockResolvedValue({
      accountId: '0.0.100000',
      keyRefId: 'operator-key-ref-id',
      publicKey: 'test-public-key',
    });

    const { networkMock, configMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = {
      network: networkMock,
      config: configMock,
      keyResolver: {
        resolveAccountCredentials: resolveAccountCredentialsMock,
      } as unknown as KeyResolverService,
    };
    const args = makeArgs(api, logger, {
      name: SWAP_NAME,
      to: MOCK_ACCOUNT_ID_ALT,
      amount: HBAR_AMOUNT,
    });

    await swapAddHbar(args);

    expect(resolveAccountCredentialsMock).toHaveBeenCalledWith(
      undefined,
      expect.any(String),
      true,
    );

    expect(addTransferMock).toHaveBeenCalledWith(
      SWAP_NAME,
      expect.objectContaining({
        from: expect.objectContaining({
          accountId: '0.0.100000',
          keyRefId: 'operator-key-ref-id',
        }),
      }),
    );
  });

  test('uses key manager from config when not specified in args', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      assertCanAdd: jest.fn(),
      addTransfer: jest
        .fn()
        .mockReturnValue({ ...mockEmptySwap, transfers: [{}] }),
    }));

    const resolveAccountCredentialsMock = jest.fn().mockResolvedValue({
      accountId: MOCK_ACCOUNT_ID,
      keyRefId: FROM_KEY_REF_ID,
      publicKey: 'test-public-key',
    });

    const { networkMock, configMock } = makeSwapApiMocks();
    configMock.getOption = jest.fn().mockReturnValue('local_encrypted');

    const api: Partial<CoreApi> = {
      network: networkMock,
      config: configMock,
      keyResolver: {
        resolveAccountCredentials: resolveAccountCredentialsMock,
      } as unknown as KeyResolverService,
    };
    const args = makeArgs(api, logger, {
      name: SWAP_NAME,
      from: FROM_ACCOUNT_INPUT,
      to: MOCK_ACCOUNT_ID_ALT,
      amount: HBAR_AMOUNT,
    });

    await swapAddHbar(args);

    expect(resolveAccountCredentialsMock).toHaveBeenCalledWith(
      expect.anything(),
      'local_encrypted',
      true,
    );
  });

  test('throws ValidationError when swap transfer limit is reached', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      assertCanAdd: jest.fn().mockImplementation(() => {
        throw new ValidationError('Cannot add transfers: limit reached');
      }),
      addTransfer: jest.fn(),
    }));

    const { networkMock, configMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = {
      network: networkMock,
      config: configMock,
      keyResolver: {
        resolveAccountCredentials: jest.fn().mockResolvedValue({
          accountId: MOCK_ACCOUNT_ID,
          keyRefId: FROM_KEY_REF_ID,
          publicKey: 'test-public-key',
        }),
      } as unknown as KeyResolverService,
    };
    const args = makeArgs(api, logger, {
      name: SWAP_NAME,
      to: MOCK_ACCOUNT_ID_ALT,
      amount: HBAR_AMOUNT,
    });

    await expect(swapAddHbar(args)).rejects.toThrow(ValidationError);
  });

  test('throws NotFoundError when swap does not exist', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      assertCanAdd: jest.fn().mockImplementation(() => {
        throw new NotFoundError(`Swap "${SWAP_NAME}" not found.`);
      }),
      addTransfer: jest.fn(),
    }));

    const { networkMock, configMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = {
      network: networkMock,
      config: configMock,
      keyResolver: {
        resolveAccountCredentials: jest.fn().mockResolvedValue({
          accountId: MOCK_ACCOUNT_ID,
          keyRefId: FROM_KEY_REF_ID,
          publicKey: 'test-public-key',
        }),
      } as unknown as KeyResolverService,
    };
    const args = makeArgs(api, logger, {
      name: SWAP_NAME,
      to: MOCK_ACCOUNT_ID_ALT,
      amount: HBAR_AMOUNT,
    });

    await expect(swapAddHbar(args)).rejects.toThrow(NotFoundError);
  });
});

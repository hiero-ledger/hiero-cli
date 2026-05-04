import type { KeyResolverService } from '@/core';
import type { CoreApi } from '@/core/core-api/core-api.interface';

import {
  MOCK_ACCOUNT_ID,
  MOCK_ACCOUNT_ID_ALT,
  MOCK_HEDERA_ENTITY_ID_1,
} from '@/__tests__/mocks/fixtures';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { NotFoundError, ValidationError } from '@/core/errors';
import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';
import { swapAddFt } from '@/plugins/swap/commands/add-ft/handler';
import { SwapAddFtOutputSchema } from '@/plugins/swap/commands/add-ft/output';
import { SwapTransferType } from '@/plugins/swap/schema';
import {
  formatAccount,
  formatToken,
  SwapStateHelper,
} from '@/plugins/swap/state-helper';
import {
  resolveDestinationAccountParameter,
  resolveTokenParameter,
} from '@/plugins/token/resolver-helper';

import {
  FROM_ACCOUNT_INPUT,
  FROM_KEY_REF_ID,
  FT_AMOUNT_RAW,
  mockEmptySwap,
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

jest.mock('@/plugins/token/resolver-helper', () => ({
  resolveDestinationAccountParameter: jest.fn(),
  resolveTokenParameter: jest.fn(),
}));

const MockedHelper = SwapStateHelper as jest.Mock;
const mockedFormatAccount = formatAccount as jest.Mock;
const mockedFormatToken = formatToken as jest.Mock;
const mockedResolveDestination =
  resolveDestinationAccountParameter as jest.Mock;
const mockedResolveToken = resolveTokenParameter as jest.Mock;

describe('swap plugin - add-ft command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedResolveDestination.mockReturnValue({
      accountId: MOCK_ACCOUNT_ID_ALT,
    });
    mockedResolveToken.mockReturnValue({ tokenId: MOCK_HEDERA_ENTITY_ID_1 });
    mockedFormatAccount.mockImplementation(
      (input: string, accountId: string) =>
        input !== accountId ? `${input} (${accountId})` : accountId,
    );
    mockedFormatToken.mockImplementation((input: string, tokenId: string) =>
      input !== tokenId ? `${input} (${tokenId})` : tokenId,
    );
  });

  test('adds fungible token transfer with all required fields', async () => {
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
      token: TOKEN_INPUT,
      amount: FT_AMOUNT_RAW,
    });

    const result = await swapAddFt(args);

    expect(addTransferMock).toHaveBeenCalledWith(
      SWAP_NAME,
      expect.objectContaining({
        type: SwapTransferType.FT,
        from: expect.objectContaining({
          input: FROM_ACCOUNT_INPUT,
          accountId: MOCK_ACCOUNT_ID,
          keyRefId: FROM_KEY_REF_ID,
        }),
        to: expect.objectContaining({ accountId: MOCK_ACCOUNT_ID_ALT }),
        token: expect.objectContaining({
          input: TOKEN_INPUT,
          tokenId: MOCK_HEDERA_ENTITY_ID_1,
        }),
        amount: FT_AMOUNT_RAW,
      }),
    );

    const output = assertOutput(result.result, SwapAddFtOutputSchema);
    expect(output.swapName).toBe(SWAP_NAME);
    expect(output.amount).toBe(FT_AMOUNT_RAW);
    expect(output.transferCount).toBe(1);
    expect(output.maxTransfers).toBe(
      HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION,
    );
  });

  test('resolves token identifier before storing', async () => {
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
      token: TOKEN_INPUT,
      amount: FT_AMOUNT_RAW,
    });

    await swapAddFt(args);

    expect(mockedResolveToken).toHaveBeenCalledWith(
      TOKEN_INPUT,
      expect.anything(),
      expect.any(String),
    );
  });

  test('throws NotFoundError when token cannot be resolved', async () => {
    const logger = makeLogger();
    mockedResolveToken.mockReturnValue(null);
    MockedHelper.mockImplementation(() => ({
      assertCanAdd: jest.fn(),
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
      from: FROM_ACCOUNT_INPUT,
      to: MOCK_ACCOUNT_ID_ALT,
      token: 'unknown-token',
      amount: FT_AMOUNT_RAW,
    });

    await expect(swapAddFt(args)).rejects.toThrow(NotFoundError);
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
        resolveAccountCredentials: jest.fn(),
      } as unknown as KeyResolverService,
    };
    const args = makeArgs(api, logger, {
      name: SWAP_NAME,
      to: MOCK_ACCOUNT_ID_ALT,
      token: TOKEN_INPUT,
      amount: FT_AMOUNT_RAW,
    });

    await expect(swapAddFt(args)).rejects.toThrow(ValidationError);
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
      token: TOKEN_INPUT,
      amount: FT_AMOUNT_RAW,
    });

    await swapAddFt(args);

    expect(resolveAccountCredentialsMock).toHaveBeenCalledWith(
      expect.anything(),
      'local_encrypted',
      true,
      expect.any(Array),
    );
  });
});

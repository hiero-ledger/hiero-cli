import type { KeyResolverService } from '@/core';
import type { CoreApi } from '@/core/core-api/core-api.interface';

import {
  MOCK_ACCOUNT_ID,
  MOCK_ACCOUNT_ID_ALT,
  MOCK_HEDERA_ENTITY_ID_1,
} from '@/__tests__/mocks/fixtures';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { ValidationError } from '@/core/errors';
import { HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION } from '@/core/shared/constants';
import { swapAddFt } from '@/plugins/swap/commands/add-ft/handler';
import { SwapAddFtOutputSchema } from '@/plugins/swap/commands/add-ft/output';
import { SwapTransferType } from '@/plugins/swap/schema';
import { SwapStateHelper } from '@/plugins/swap/state-helper';
import {
  formatAccount,
  formatToken,
} from '@/plugins/swap/utils/format-helpers';

import {
  FROM_ACCOUNT_INPUT,
  FROM_KEY_REF_ID,
  FT_AMOUNT_RAW,
  mockEmptySwap,
  SWAP_NAME,
  TOKEN_INPUT,
} from './helpers/fixtures';
import {
  makeArgs,
  makeIdentityResolutionServiceMock,
  makeLogger,
  makeSwapApiMocks,
} from './helpers/mocks';

jest.mock('../../state-helper', () => ({
  SwapStateHelper: jest.fn(),
}));

jest.mock('../../utils/format-helpers', () => ({
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

describe('swap plugin - add-ft command', () => {
  let resolveAccountCredentialsMock: jest.Mock;
  let resolveDestinationMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    resolveAccountCredentialsMock = jest.fn().mockResolvedValue({
      accountId: MOCK_ACCOUNT_ID,
      keyRefId: FROM_KEY_REF_ID,
      publicKey: 'test-public-key',
    });
    resolveDestinationMock = jest.fn().mockResolvedValue({
      accountId: MOCK_ACCOUNT_ID_ALT,
    });
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

    const { networkMock, configMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = {
      network: networkMock,
      config: configMock,
      keyResolver: {
        resolveAccountCredentials: resolveAccountCredentialsMock,
        resolveDestination: resolveDestinationMock,
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

  test('resolves token identifier via identity resolution before storing', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      assertCanAdd: jest.fn(),
      addTransfer: jest
        .fn()
        .mockReturnValue({ ...mockEmptySwap, transfers: [{}] }),
    }));

    const identityResolutionMock = makeIdentityResolutionServiceMock();
    identityResolutionMock.resolveReferenceToEntityOrEvmAddress.mockReturnValue(
      {
        entityIdOrEvmAddress: MOCK_HEDERA_ENTITY_ID_1,
      },
    );

    const { networkMock, configMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = {
      network: networkMock,
      config: configMock,
      identityResolution: identityResolutionMock,
      keyResolver: {
        resolveAccountCredentials: resolveAccountCredentialsMock,
        resolveDestination: resolveDestinationMock,
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

    expect(
      identityResolutionMock.resolveReferenceToEntityOrEvmAddress,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ entityReference: TOKEN_INPUT }),
    );
  });

  test('fetches and stores token decimals when adding transfer', async () => {
    const logger = makeLogger();
    const addTransferMock = jest
      .fn()
      .mockReturnValue({ ...mockEmptySwap, transfers: [{}] });
    MockedHelper.mockImplementation(() => ({
      assertCanAdd: jest.fn(),
      addTransfer: addTransferMock,
    }));

    const getTokenInfoMock = jest.fn().mockResolvedValue({ decimals: '6' });

    const { networkMock, configMock, mirrorMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = {
      network: networkMock,
      config: configMock,
      mirror: {
        ...mirrorMock,
        getTokenInfo: getTokenInfoMock,
      } as unknown as CoreApi['mirror'],
      keyResolver: {
        resolveAccountCredentials: resolveAccountCredentialsMock,
        resolveDestination: resolveDestinationMock,
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

    expect(addTransferMock).toHaveBeenCalledWith(
      SWAP_NAME,
      expect.objectContaining({
        token: expect.objectContaining({ decimals: 6 }),
      }),
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
        resolveAccountCredentials: jest.fn(),
        resolveDestination: resolveDestinationMock,
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

    const { networkMock, configMock } = makeSwapApiMocks();
    configMock.getOption = jest.fn().mockReturnValue('local_encrypted');

    const api: Partial<CoreApi> = {
      network: networkMock,
      config: configMock,
      keyResolver: {
        resolveAccountCredentials: resolveAccountCredentialsMock,
        resolveDestination: resolveDestinationMock,
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

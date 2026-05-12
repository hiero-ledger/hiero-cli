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
  FROM_ACCOUNT_INPUT,
  FROM_KEY_REF_ID,
  FT_AMOUNT_INPUT,
  FT_AMOUNT_STORED,
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

const MockedHelper = SwapStateHelper as jest.Mock;

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
      amount: FT_AMOUNT_INPUT,
    });

    const result = await swapAddFt(args);

    expect(addTransferMock).toHaveBeenCalledWith(
      SWAP_NAME,
      expect.objectContaining({
        type: SwapTransferType.FT,
        from: { accountId: MOCK_ACCOUNT_ID, keyRefId: FROM_KEY_REF_ID },
        to: MOCK_ACCOUNT_ID_ALT,
        token: MOCK_HEDERA_ENTITY_ID_1,
        amount: FT_AMOUNT_STORED,
      }),
    );

    const output = assertOutput(result.result, SwapAddFtOutputSchema);
    expect(output.swapName).toBe(SWAP_NAME);
    expect(output.amount).toBe(FT_AMOUNT_INPUT);
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
      amount: FT_AMOUNT_INPUT,
    });

    await swapAddFt(args);

    expect(
      identityResolutionMock.resolveReferenceToEntityOrEvmAddress,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ entityReference: TOKEN_INPUT }),
    );
  });

  test('fetches token info from mirror node and converts amount using decimals', async () => {
    const logger = makeLogger();
    const addTransferMock = jest
      .fn()
      .mockReturnValue({ ...mockEmptySwap, transfers: [{}] });
    MockedHelper.mockImplementation(() => ({
      assertCanAdd: jest.fn(),
      addTransfer: addTransferMock,
    }));

    const getTokenInfoMock = jest.fn().mockResolvedValue({ decimals: '2' });

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
      amount: '5',
    });

    await swapAddFt(args);

    expect(getTokenInfoMock).toHaveBeenCalledWith(MOCK_HEDERA_ENTITY_ID_1);
    expect(addTransferMock).toHaveBeenCalledWith(
      SWAP_NAME,
      expect.objectContaining({ amount: '500' }),
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
      amount: FT_AMOUNT_INPUT,
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
      amount: FT_AMOUNT_INPUT,
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

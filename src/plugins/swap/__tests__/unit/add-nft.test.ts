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
import { swapAddNft } from '@/plugins/swap/commands/add-nft/handler';
import { SwapAddNftOutputSchema } from '@/plugins/swap/commands/add-nft/output';
import { SwapTransferType } from '@/plugins/swap/schema';
import { SwapStateHelper } from '@/plugins/swap/state-helper';
import {
  formatAccount,
  formatToken,
} from '@/plugins/swap/utils/format-helpers';

import {
  FROM_ACCOUNT_INPUT,
  FROM_KEY_REF_ID,
  mockEmptySwap,
  NFT_SERIALS,
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

describe('swap plugin - add-nft command', () => {
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

  test('adds NFT transfer with serial numbers', async () => {
    const logger = makeLogger();
    const addTransferMock = jest.fn().mockReturnValue({
      ...mockEmptySwap,
      transfers: [{}],
    });
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
      serials: NFT_SERIALS.join(','),
    });

    const result = await swapAddNft(args);

    expect(addTransferMock).toHaveBeenCalledWith(
      SWAP_NAME,
      expect.objectContaining({
        type: SwapTransferType.NFT,
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
        serials: NFT_SERIALS,
      }),
    );

    const output = assertOutput(result.result, SwapAddNftOutputSchema);
    expect(output.swapName).toBe(SWAP_NAME);
    expect(output.serials).toEqual(NFT_SERIALS);
    expect(output.transferCount).toBe(1);
    expect(output.maxTransfers).toBe(
      HEDERA_MAX_TRANSFER_ENTRIES_PER_TRANSACTION,
    );
  });

  test('checks capacity against number of serials, not transfers', async () => {
    const logger = makeLogger();
    const assertCanAddMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      assertCanAdd: assertCanAddMock,
      addTransfer: jest
        .fn()
        .mockReturnValue({ ...mockEmptySwap, transfers: [{}] }),
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
      serials: NFT_SERIALS.join(','),
    });

    await swapAddNft(args);

    expect(assertCanAddMock).toHaveBeenCalledWith(
      SWAP_NAME,
      NFT_SERIALS.length,
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
      serials: NFT_SERIALS.join(','),
    });

    await swapAddNft(args);

    expect(
      identityResolutionMock.resolveReferenceToEntityOrEvmAddress,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ entityReference: TOKEN_INPUT }),
    );
  });

  test('throws ValidationError when not enough transfer slots remain for all serials', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      assertCanAdd: jest.fn().mockImplementation(() => {
        throw new ValidationError(
          'Cannot add 3 transfer(s): not enough slots remaining',
        );
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
      serials: NFT_SERIALS.join(','),
    });

    await expect(swapAddNft(args)).rejects.toThrow(ValidationError);
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
        resolveAccountCredentials: jest.fn(),
        resolveDestination: resolveDestinationMock,
      } as unknown as KeyResolverService,
    };
    const args = makeArgs(api, logger, {
      name: SWAP_NAME,
      to: MOCK_ACCOUNT_ID_ALT,
      token: TOKEN_INPUT,
      serials: '1',
    });

    await expect(swapAddNft(args)).rejects.toThrow(NotFoundError);
  });
});

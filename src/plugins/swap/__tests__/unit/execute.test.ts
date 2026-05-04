import type {
  HederaMirrornodeService,
  TxExecuteService,
  TxSignService,
} from '@/core';
import type { CoreApi } from '@/core/core-api/core-api.interface';

import {
  MOCK_HEDERA_ENTITY_ID_1,
  MOCK_TX_ID,
} from '@/__tests__/mocks/fixtures';
import { createMockTransaction } from '@/__tests__/mocks/hedera-sdk-mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { SupportedNetwork } from '@/core/types/shared.types';
import { swapExecute } from '@/plugins/swap/commands/execute/handler';
import { SwapExecuteOutputSchema } from '@/plugins/swap/commands/execute/output';
import { SwapTransferType } from '@/plugins/swap/schema';
import {
  formatAccount,
  formatToken,
  SwapStateHelper,
} from '@/plugins/swap/state-helper';

import {
  FROM_KEY_REF_ID,
  mockEmptySwap,
  mockSwapWithFt,
  mockSwapWithHbar,
  mockSwapWithMultipleTransfers,
  mockSwapWithNft,
  SWAP_NAME,
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

describe('swap plugin - execute command', () => {
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

  test('executes HBAR swap successfully and deletes it from state', async () => {
    const logger = makeLogger();
    const deleteSwapMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getSwapOrThrow: jest.fn().mockReturnValue(mockSwapWithHbar),
      deleteSwap: deleteSwapMock,
    }));

    const mockTx = createMockTransaction();
    const { networkMock, txSignMock, txExecuteMock } = makeSwapApiMocks();
    txSignMock.sign = jest.fn().mockResolvedValue(mockTx);
    txExecuteMock.execute = jest.fn().mockResolvedValue({
      success: true,
      transactionId: MOCK_TX_ID,
      receipt: { status: { status: 'SUCCESS' } },
    });

    const api: Partial<CoreApi> = {
      network: networkMock,
      txSign: txSignMock,
      txExecute: txExecuteMock,
      mirror: { getTokenInfo: jest.fn() } as unknown as HederaMirrornodeService,
      transfer: {
        buildTransferTransaction: jest.fn().mockReturnValue(mockTx),
      },
    };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    const result = await swapExecute(args);

    expect(deleteSwapMock).toHaveBeenCalledWith(SWAP_NAME);

    const output = assertOutput(result.result, SwapExecuteOutputSchema);
    expect(output.transactionId).toBe(MOCK_TX_ID);
    expect(output.network).toBe(SupportedNetwork.TESTNET);
    expect(output.swapName).toBe(SWAP_NAME);
    expect(output.transferCount).toBe(1);
    expect(output.transfers).toHaveLength(1);
    expect(output.transfers[0].type).toBe(SwapTransferType.HBAR);
  });

  test('signs with all unique keyRefIds from from-accounts', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getSwapOrThrow: jest.fn().mockReturnValue(mockSwapWithHbar),
      deleteSwap: jest.fn(),
    }));

    const mockTx = createMockTransaction();
    const signMock = jest.fn().mockResolvedValue(mockTx);
    const { networkMock, txExecuteMock } = makeSwapApiMocks();

    const api: Partial<CoreApi> = {
      network: networkMock,
      txSign: { sign: signMock } as unknown as TxSignService,
      txExecute: txExecuteMock,
      mirror: { getTokenInfo: jest.fn() } as unknown as HederaMirrornodeService,
      transfer: {
        buildTransferTransaction: jest.fn().mockReturnValue(mockTx),
      },
    };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    await swapExecute(args);

    expect(signMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([FROM_KEY_REF_ID]),
    );
  });

  test('deduplicates keyRefIds when same account appears in multiple transfers', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getSwapOrThrow: jest.fn().mockReturnValue(mockSwapWithMultipleTransfers),
      deleteSwap: jest.fn(),
    }));

    const mockTx = createMockTransaction();
    const signMock = jest.fn().mockResolvedValue(mockTx);
    const { networkMock, txExecuteMock } = makeSwapApiMocks();

    const api: Partial<CoreApi> = {
      network: networkMock,
      txSign: { sign: signMock } as unknown as TxSignService,
      txExecute: txExecuteMock,
      mirror: { getTokenInfo: jest.fn() } as unknown as HederaMirrornodeService,
      transfer: {
        buildTransferTransaction: jest.fn().mockReturnValue(mockTx),
      },
    };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    await swapExecute(args);

    const [, keyRefIds] = signMock.mock.calls[0];
    const uniqueKeyRefIds = [...new Set(keyRefIds)];
    expect(keyRefIds).toHaveLength(uniqueKeyRefIds.length);
  });

  test('fetches FT token decimals only for non-raw-unit amounts', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getSwapOrThrow: jest.fn().mockReturnValue(mockSwapWithFt),
      deleteSwap: jest.fn(),
    }));

    const getTokenInfoMock = jest.fn().mockResolvedValue({
      token_id: MOCK_HEDERA_ENTITY_ID_1,
      decimals: '8',
    });
    const mockTx = createMockTransaction();
    const { networkMock, txSignMock, txExecuteMock } = makeSwapApiMocks();

    const api: Partial<CoreApi> = {
      network: networkMock,
      txSign: txSignMock,
      txExecute: txExecuteMock,
      mirror: {
        getTokenInfo: getTokenInfoMock,
      } as unknown as HederaMirrornodeService,
      transfer: {
        buildTransferTransaction: jest.fn().mockReturnValue(mockTx),
      },
    };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    await swapExecute(args);

    // FT_AMOUNT_RAW = '100t' ends with 't' (raw units) — no decimals fetch needed
    expect(getTokenInfoMock).not.toHaveBeenCalled();
  });

  test('executes NFT swap with correct transfer entries', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getSwapOrThrow: jest.fn().mockReturnValue(mockSwapWithNft),
      deleteSwap: jest.fn(),
    }));

    const buildTransferMock = jest
      .fn()
      .mockReturnValue(createMockTransaction());
    const { networkMock, txSignMock, txExecuteMock } = makeSwapApiMocks();

    const api: Partial<CoreApi> = {
      network: networkMock,
      txSign: txSignMock,
      txExecute: txExecuteMock,
      mirror: { getTokenInfo: jest.fn() } as unknown as HederaMirrornodeService,
      transfer: { buildTransferTransaction: buildTransferMock },
    };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    const result = await swapExecute(args);

    const output = assertOutput(result.result, SwapExecuteOutputSchema);
    expect(output.transfers[0].type).toBe(SwapTransferType.NFT);
  });

  test('throws ValidationError when swap has no transfers', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getSwapOrThrow: jest.fn().mockReturnValue(mockEmptySwap),
      deleteSwap: jest.fn(),
    }));

    const { networkMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    await expect(swapExecute(args)).rejects.toThrow(ValidationError);
  });

  test('throws NotFoundError when swap does not exist', async () => {
    const logger = makeLogger();
    MockedHelper.mockImplementation(() => ({
      getSwapOrThrow: jest.fn().mockImplementation(() => {
        throw new NotFoundError(`Swap "${SWAP_NAME}" not found.`);
      }),
      deleteSwap: jest.fn(),
    }));

    const { networkMock } = makeSwapApiMocks();
    const api: Partial<CoreApi> = { network: networkMock };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    await expect(swapExecute(args)).rejects.toThrow(NotFoundError);
  });

  test('throws TransactionError and does not delete swap when execution fails', async () => {
    const logger = makeLogger();
    const deleteSwapMock = jest.fn();
    MockedHelper.mockImplementation(() => ({
      getSwapOrThrow: jest.fn().mockReturnValue(mockSwapWithHbar),
      deleteSwap: deleteSwapMock,
    }));

    const mockTx = createMockTransaction();
    const { networkMock, txSignMock } = makeSwapApiMocks();
    const failingExecuteMock: jest.Mocked<TxExecuteService> = {
      execute: jest.fn().mockResolvedValue({
        success: false,
        transactionId: MOCK_TX_ID,
        receipt: { status: { status: 'INSUFFICIENT_TX_FEE' } },
      }),
      executeContractCreateFlow: jest.fn(),
    };

    const api: Partial<CoreApi> = {
      network: networkMock,
      txSign: txSignMock,
      txExecute: failingExecuteMock,
      mirror: { getTokenInfo: jest.fn() } as unknown as HederaMirrornodeService,
      transfer: {
        buildTransferTransaction: jest.fn().mockReturnValue(mockTx),
      },
    };
    const args = makeArgs(api, logger, { name: SWAP_NAME });

    await expect(swapExecute(args)).rejects.toThrow(TransactionError);
    expect(deleteSwapMock).not.toHaveBeenCalled();
  });
});

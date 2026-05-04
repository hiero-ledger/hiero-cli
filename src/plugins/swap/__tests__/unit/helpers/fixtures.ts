import type { SwapEntry } from '@/plugins/swap/schema';

import {
  MOCK_ACCOUNT_ID,
  MOCK_ACCOUNT_ID_ALT,
  MOCK_HEDERA_ENTITY_ID_1,
} from '@/__tests__/mocks/fixtures';
import { SwapTransferType } from '@/plugins/swap/schema';

export const SWAP_NAME = 'my-swap';
export const SWAP_MEMO = 'Test swap memo';

export const FROM_ACCOUNT_INPUT = 'alice';
export const FROM_KEY_REF_ID = 'alice-key-ref-id';
export const TOKEN_INPUT = 'my-token';

export const HBAR_AMOUNT = '10';
export const FT_AMOUNT_RAW = '100t';
export const NFT_SERIALS = [1, 2, 3];

export const mockEmptySwap: SwapEntry = {
  transfers: [],
};

export const mockSwapWithHbar: SwapEntry = {
  transfers: [
    {
      type: SwapTransferType.HBAR,
      from: {
        input: FROM_ACCOUNT_INPUT,
        accountId: MOCK_ACCOUNT_ID,
        keyRefId: FROM_KEY_REF_ID,
      },
      to: { input: MOCK_ACCOUNT_ID_ALT, accountId: MOCK_ACCOUNT_ID_ALT },
      amount: HBAR_AMOUNT,
    },
  ],
};

export const mockSwapWithFt: SwapEntry = {
  transfers: [
    {
      type: SwapTransferType.FT,
      from: {
        input: FROM_ACCOUNT_INPUT,
        accountId: MOCK_ACCOUNT_ID,
        keyRefId: FROM_KEY_REF_ID,
      },
      to: { input: MOCK_ACCOUNT_ID_ALT, accountId: MOCK_ACCOUNT_ID_ALT },
      token: { input: TOKEN_INPUT, tokenId: MOCK_HEDERA_ENTITY_ID_1 },
      amount: FT_AMOUNT_RAW,
    },
  ],
};

export const mockSwapWithNft: SwapEntry = {
  transfers: [
    {
      type: SwapTransferType.NFT,
      from: {
        input: FROM_ACCOUNT_INPUT,
        accountId: MOCK_ACCOUNT_ID,
        keyRefId: FROM_KEY_REF_ID,
      },
      to: { input: MOCK_ACCOUNT_ID_ALT, accountId: MOCK_ACCOUNT_ID_ALT },
      token: { input: TOKEN_INPUT, tokenId: MOCK_HEDERA_ENTITY_ID_1 },
      serials: NFT_SERIALS,
    },
  ],
};

export const mockSwapWithMultipleTransfers: SwapEntry = {
  memo: SWAP_MEMO,
  transfers: [
    {
      type: SwapTransferType.HBAR,
      from: {
        input: FROM_ACCOUNT_INPUT,
        accountId: MOCK_ACCOUNT_ID,
        keyRefId: FROM_KEY_REF_ID,
      },
      to: { input: MOCK_ACCOUNT_ID_ALT, accountId: MOCK_ACCOUNT_ID_ALT },
      amount: HBAR_AMOUNT,
    },
    {
      type: SwapTransferType.FT,
      from: {
        input: FROM_ACCOUNT_INPUT,
        accountId: MOCK_ACCOUNT_ID,
        keyRefId: FROM_KEY_REF_ID,
      },
      to: { input: MOCK_ACCOUNT_ID_ALT, accountId: MOCK_ACCOUNT_ID_ALT },
      token: { input: TOKEN_INPUT, tokenId: MOCK_HEDERA_ENTITY_ID_1 },
      amount: FT_AMOUNT_RAW,
    },
    {
      type: SwapTransferType.NFT,
      from: {
        input: FROM_ACCOUNT_INPUT,
        accountId: MOCK_ACCOUNT_ID,
        keyRefId: FROM_KEY_REF_ID,
      },
      to: { input: MOCK_ACCOUNT_ID_ALT, accountId: MOCK_ACCOUNT_ID_ALT },
      token: { input: TOKEN_INPUT, tokenId: MOCK_HEDERA_ENTITY_ID_1 },
      serials: NFT_SERIALS,
    },
  ],
};

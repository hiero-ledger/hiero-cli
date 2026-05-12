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

export const HBAR_AMOUNT_INPUT = '10';
export const FT_AMOUNT_INPUT = '100t';
export const NFT_SERIALS = [1, 2, 3];

export const HBAR_AMOUNT_STORED = '1000000000';
export const FT_AMOUNT_STORED = '100';

export const mockEmptySwap: SwapEntry = {
  transfers: [],
};

export const mockSwapWithHbar: SwapEntry = {
  transfers: [
    {
      type: SwapTransferType.HBAR,
      from: {
        accountId: MOCK_ACCOUNT_ID,
        keyRefId: FROM_KEY_REF_ID,
      },
      to: MOCK_ACCOUNT_ID_ALT,
      amount: HBAR_AMOUNT_STORED,
    },
  ],
};

export const mockSwapWithFt: SwapEntry = {
  transfers: [
    {
      type: SwapTransferType.FT,
      from: {
        accountId: MOCK_ACCOUNT_ID,
        keyRefId: FROM_KEY_REF_ID,
      },
      to: MOCK_ACCOUNT_ID_ALT,
      token: MOCK_HEDERA_ENTITY_ID_1,
      amount: FT_AMOUNT_STORED,
    },
  ],
};

export const mockSwapWithNft: SwapEntry = {
  transfers: [
    {
      type: SwapTransferType.NFT,
      from: {
        accountId: MOCK_ACCOUNT_ID,
        keyRefId: FROM_KEY_REF_ID,
      },
      to: MOCK_ACCOUNT_ID_ALT,
      token: MOCK_HEDERA_ENTITY_ID_1,
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
        accountId: MOCK_ACCOUNT_ID,
        keyRefId: FROM_KEY_REF_ID,
      },
      to: MOCK_ACCOUNT_ID_ALT,
      amount: HBAR_AMOUNT_STORED,
    },
    {
      type: SwapTransferType.FT,
      from: {
        accountId: MOCK_ACCOUNT_ID,
        keyRefId: FROM_KEY_REF_ID,
      },
      to: MOCK_ACCOUNT_ID_ALT,
      token: MOCK_HEDERA_ENTITY_ID_1,
      amount: FT_AMOUNT_STORED,
    },
    {
      type: SwapTransferType.NFT,
      from: {
        accountId: MOCK_ACCOUNT_ID,
        keyRefId: FROM_KEY_REF_ID,
      },
      to: MOCK_ACCOUNT_ID_ALT,
      token: MOCK_HEDERA_ENTITY_ID_1,
      serials: NFT_SERIALS,
    },
  ],
};

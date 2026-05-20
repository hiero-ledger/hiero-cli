import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import '@/core/utils/json-serialize';

import {
  MOCK_ACCOUNT_ID,
  MOCK_ACCOUNT_ID_ALT,
  MOCK_HEDERA_ENTITY_ID_1,
} from '@/__tests__/mocks/fixtures';
import { assertOutput } from '@/__tests__/utils/assert-output';
import {
  EntityReferenceType,
  SupportedNetwork,
} from '@/core/types/shared.types';
import {
  tokenAllowanceNftList,
  TokenAllowanceNftListOutputSchema,
} from '@/plugins/token/commands/allowance-nft-list';

import { makeApiMocks } from './helpers/mocks';

const TOKEN_ID = MOCK_HEDERA_ENTITY_ID_1;
const ACCOUNT_ID = MOCK_ACCOUNT_ID;
const SPENDER_ID = MOCK_ACCOUNT_ID_ALT;

const makeNftAllowances = () => ({
  allowances: [
    {
      owner: ACCOUNT_ID,
      spender: SPENDER_ID,
      token_id: TOKEN_ID,
      serial_number: 2,
      approved_for_all: false,
    },
    {
      owner: ACCOUNT_ID,
      spender: SPENDER_ID,
      token_id: TOKEN_ID,
      serial_number: 1,
      approved_for_all: false,
    },
  ],
  links: { next: null },
});

const makeArgs = (
  api: ReturnType<typeof makeApiMocks>['api'],
  args?: Record<string, unknown>,
): CommandHandlerArgs => ({
  args: {
    account: ACCOUNT_ID,
    ...args,
  },
  api,
});

describe('tokenAllowanceNftList', () => {
  test('groups serial allowances by token and spender', async () => {
    const getNftAllowances = jest.fn().mockResolvedValue(makeNftAllowances());
    const getTokenInfo = jest.fn().mockResolvedValue({
      name: 'Position NFT',
      symbol: 'PNFT',
    });
    const { api } = makeApiMocks({
      mirror: { getNftAllowances, getTokenInfo },
    });

    const result = await tokenAllowanceNftList(makeArgs(api));
    const output = assertOutput(
      result.result,
      TokenAllowanceNftListOutputSchema,
    );

    expect(output.total).toBe(1);
    expect(output.allowances[0].tokenId).toBe(TOKEN_ID);
    expect(output.allowances[0].tokenSymbol).toBe('PNFT');
    expect(output.allowances[0].spenderAccountId).toBe(SPENDER_ID);
    expect(output.allowances[0].approvedForAll).toBe(false);
    expect(output.allowances[0].serialNumbers).toEqual([1, 2]);
  });

  test('preserves approvedForAll scope', async () => {
    const getNftAllowances = jest.fn().mockResolvedValue({
      allowances: [
        {
          owner: ACCOUNT_ID,
          spender: SPENDER_ID,
          token_id: TOKEN_ID,
          serial_number: null,
          approved_for_all: true,
        },
      ],
      links: { next: null },
    });
    const resolveAccount = jest
      .fn()
      .mockImplementation(({ accountReference }) =>
        Promise.resolve({ accountId: accountReference, accountPublicKey: '' }),
      );
    const { api } = makeApiMocks({
      identityResolution: { resolveAccount },
      mirror: {
        getNftAllowances,
        getTokenInfo: jest.fn().mockResolvedValue({
          name: 'Position NFT',
          symbol: 'PNFT',
        }),
      },
    });

    const result = await tokenAllowanceNftList(makeArgs(api));
    const output = assertOutput(
      result.result,
      TokenAllowanceNftListOutputSchema,
    );

    expect(output.allowances[0].approvedForAll).toBe(true);
    expect(output.allowances[0].serialNumbers).toEqual([]);
  });

  test('raw output skips token metadata lookup', async () => {
    const getNftAllowances = jest.fn().mockResolvedValue(makeNftAllowances());
    const getTokenInfo = jest.fn();
    const { api } = makeApiMocks({
      mirror: { getNftAllowances, getTokenInfo },
    });

    const result = await tokenAllowanceNftList(makeArgs(api, { raw: true }));
    const output = assertOutput(
      result.result,
      TokenAllowanceNftListOutputSchema,
    );

    expect(output.raw).toBe(true);
    expect(output.allowances[0].tokenName).toBeUndefined();
    expect(getTokenInfo).not.toHaveBeenCalled();
  });

  test('filters by token and spender', async () => {
    const getNftAllowances = jest.fn().mockResolvedValue({
      allowances: [
        ...makeNftAllowances().allowances,
        {
          owner: ACCOUNT_ID,
          spender: '0.0.9999',
          token_id: TOKEN_ID,
          serial_number: 3,
          approved_for_all: false,
        },
      ],
      links: { next: null },
    });
    const resolveAccount = jest
      .fn()
      .mockImplementation(({ accountReference }) =>
        Promise.resolve({ accountId: accountReference, accountPublicKey: '' }),
      );
    const { api } = makeApiMocks({
      identityResolution: { resolveAccount },
      mirror: {
        getNftAllowances,
        getTokenInfo: jest.fn().mockResolvedValue({
          name: 'Position NFT',
          symbol: 'PNFT',
        }),
      },
    });

    const result = await tokenAllowanceNftList(
      makeArgs(api, { token: TOKEN_ID, spender: SPENDER_ID }),
    );
    const output = assertOutput(
      result.result,
      TokenAllowanceNftListOutputSchema,
    );

    expect(output.total).toBe(1);
    expect(output.allowances[0].serialNumbers).toEqual([1, 2]);
    expect(resolveAccount).toHaveBeenCalledWith({
      accountReference: SPENDER_ID,
      type: EntityReferenceType.ENTITY_ID,
      network: SupportedNetwork.TESTNET,
    });
  });

  test('fetches all pages through mirror service when showAll is true', async () => {
    const getNftAllowances = jest.fn();
    const getAllNftAllowances = jest.fn().mockResolvedValue({
      allowances: [
        ...makeNftAllowances().allowances,
        {
          owner: ACCOUNT_ID,
          spender: '0.0.9999',
          token_id: TOKEN_ID,
          serial_number: 3,
          approved_for_all: false,
        },
      ],
      links: { next: null },
    });
    const { api } = makeApiMocks({
      mirror: {
        getNftAllowances,
        getAllNftAllowances,
        getTokenInfo: jest.fn().mockResolvedValue({
          name: 'Position NFT',
          symbol: 'PNFT',
        }),
      },
    });

    const result = await tokenAllowanceNftList(
      makeArgs(api, { showAll: true }),
    );
    const output = assertOutput(
      result.result,
      TokenAllowanceNftListOutputSchema,
    );

    expect(output.total).toBe(2);
    expect(getNftAllowances).not.toHaveBeenCalled();
    expect(getAllNftAllowances).toHaveBeenCalledWith(ACCOUNT_ID);
  });
});

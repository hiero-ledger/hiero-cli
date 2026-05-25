import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import '@/core/utils/json-serialize';

import {
  MOCK_ACCOUNT_ID,
  MOCK_ACCOUNT_ID_ALT,
  MOCK_HEDERA_ENTITY_ID_1,
} from '@/__tests__/mocks/fixtures';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { NotFoundError } from '@/core/errors';
import {
  EntityReferenceType,
  SupportedNetwork,
} from '@/core/types/shared.types';
import {
  tokenAllowanceFtList,
  TokenAllowanceFtListOutputSchema,
} from '@/plugins/token/commands/allowance-ft-list';

import { makeApiMocks } from './helpers/mocks';

const TOKEN_ID = MOCK_HEDERA_ENTITY_ID_1;
const ACCOUNT_ID = MOCK_ACCOUNT_ID;
const SPENDER_ID = MOCK_ACCOUNT_ID_ALT;

const makeFtAllowances = () => ({
  allowances: [
    {
      owner: ACCOUNT_ID,
      spender: SPENDER_ID,
      token_id: TOKEN_ID,
      amount: 100000000n,
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

describe('tokenAllowanceFtList', () => {
  test('returns enriched FT allowances', async () => {
    const getTokenAllowances = jest.fn().mockResolvedValue(makeFtAllowances());
    const getTokenInfo = jest.fn().mockResolvedValue({
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: '6',
    });
    const { api } = makeApiMocks({
      mirror: { getTokenAllowances, getTokenInfo },
    });

    const result = await tokenAllowanceFtList(makeArgs(api));
    const output = assertOutput(
      result.result,
      TokenAllowanceFtListOutputSchema,
    );

    expect(output.accountId).toBe(ACCOUNT_ID);
    expect(output.total).toBe(1);
    expect(output.allowances[0].tokenId).toBe(TOKEN_ID);
    expect(output.allowances[0].tokenSymbol).toBe('USDC');
    expect(output.allowances[0].amount).toBe(100000000n);
    expect(output.allowances[0].amountDisplay).toBe('100');
    expect(getTokenInfo).toHaveBeenCalledWith(TOKEN_ID);
  });

  test('raw output skips token metadata lookup', async () => {
    const getTokenAllowances = jest.fn().mockResolvedValue(makeFtAllowances());
    const getTokenInfo = jest.fn();
    const { api } = makeApiMocks({
      mirror: { getTokenAllowances, getTokenInfo },
    });

    const result = await tokenAllowanceFtList(makeArgs(api, { raw: true }));
    const output = assertOutput(
      result.result,
      TokenAllowanceFtListOutputSchema,
    );

    expect(output.raw).toBe(true);
    expect(output.allowances[0].amountDisplay).toBeUndefined();
    expect(getTokenInfo).not.toHaveBeenCalled();
  });

  test('filters by token and spender', async () => {
    const getTokenAllowances = jest.fn().mockResolvedValue({
      allowances: [
        ...makeFtAllowances().allowances,
        {
          owner: ACCOUNT_ID,
          spender: '0.0.9999',
          token_id: TOKEN_ID,
          amount: 1n,
        },
      ],
      links: { next: null },
    });
    const { api } = makeApiMocks({
      mirror: {
        getTokenAllowances,
        getTokenInfo: jest.fn().mockResolvedValue({
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: '6',
        }),
      },
    });

    const result = await tokenAllowanceFtList(
      makeArgs(api, { token: TOKEN_ID, spender: SPENDER_ID }),
    );
    const output = assertOutput(
      result.result,
      TokenAllowanceFtListOutputSchema,
    );

    expect(output.total).toBe(1);
    expect(output.allowances[0].spenderAccountId).toBe(SPENDER_ID);
  });

  test('resolves account alias', async () => {
    const getTokenAllowances = jest.fn().mockResolvedValue(makeFtAllowances());
    const resolveAccount = jest.fn().mockResolvedValue({
      accountId: ACCOUNT_ID,
      accountPublicKey: '',
    });
    const { api } = makeApiMocks({
      alias: { resolve: jest.fn() },
      identityResolution: { resolveAccount },
      mirror: {
        getTokenAllowances,
        getTokenInfo: jest.fn().mockResolvedValue({
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: '6',
        }),
      },
    });

    await tokenAllowanceFtList(makeArgs(api, { account: 'treasury' }));

    expect(getTokenAllowances).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(resolveAccount).toHaveBeenCalledWith({
      accountReference: 'treasury',
      type: EntityReferenceType.ALIAS,
      network: SupportedNetwork.TESTNET,
    });
    expect(api.alias.resolve).not.toHaveBeenCalled();
  });

  test('fetches all pages through mirror service when showAll is true', async () => {
    const getTokenAllowances = jest.fn();
    const getAllTokenAllowances = jest.fn().mockResolvedValue({
      allowances: [
        ...makeFtAllowances().allowances,
        {
          owner: ACCOUNT_ID,
          spender: SPENDER_ID,
          token_id: TOKEN_ID,
          amount: 1n,
        },
      ],
      links: { next: null },
    });
    const { api } = makeApiMocks({
      mirror: {
        getTokenAllowances,
        getAllTokenAllowances,
        getTokenInfo: jest.fn().mockResolvedValue({
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: '6',
        }),
      },
    });

    const result = await tokenAllowanceFtList(makeArgs(api, { showAll: true }));
    const output = assertOutput(
      result.result,
      TokenAllowanceFtListOutputSchema,
    );

    expect(output.total).toBe(2);
    expect(getTokenAllowances).not.toHaveBeenCalled();
    expect(getAllTokenAllowances).toHaveBeenCalledWith(ACCOUNT_ID);
  });

  test('throws NotFoundError for unknown account alias', async () => {
    const { api } = makeApiMocks({
      identityResolution: {
        resolveAccount: jest
          .fn()
          .mockRejectedValue(new NotFoundError('missing')),
      },
      mirror: { getTokenAllowances: jest.fn() },
    });

    await expect(
      tokenAllowanceFtList(makeArgs(api, { account: 'missing' })),
    ).rejects.toThrow(NotFoundError);
  });
});

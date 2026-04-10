import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import { MOCK_ACCOUNT_ID } from '@/__tests__/mocks/fixtures';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { TransactionError, ValidationError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import {
  tokenClaimAirdrop,
  TokenClaimAirdropOutputSchema,
} from '@/plugins/token/commands/claim-airdrop';

import {
  makeApiMocks,
  makeLogger,
  makeTransactionResult,
} from './helpers/mocks';

const SENDER_ID = '0.0.9999';
const TOKEN_ID_FT = '0.0.2000';
const TOKEN_ID_NFT = '0.0.3000';
const MOCK_CLAIM_TX = { test: 'claim-airdrop-transaction' };

const makeFtAirdropItem = (
  overrides?: Partial<{
    token_id: string;
    sender_id: string;
    amount: number | null;
    serial_number: number | null;
  }>,
) => ({
  amount: 1000,
  receiver_id: MOCK_ACCOUNT_ID,
  sender_id: SENDER_ID,
  serial_number: null,
  timestamp: { from: '1706745600.000000000', to: null },
  token_id: TOKEN_ID_FT,
  ...overrides,
});

const makeNftAirdropItem = (
  overrides?: Partial<{
    token_id: string;
    sender_id: string;
    serial_number: number | null;
  }>,
) => ({
  amount: null,
  receiver_id: MOCK_ACCOUNT_ID,
  sender_id: SENDER_ID,
  serial_number: 42,
  timestamp: { from: '1706745600.000000000', to: null },
  token_id: TOKEN_ID_NFT,
  ...overrides,
});

const makeFtTokenInfo = () => ({
  token_id: TOKEN_ID_FT,
  name: 'FungibleToken',
  symbol: 'FT',
  decimals: '2',
  total_supply: '10000',
  max_supply: '0',
  type: 'FUNGIBLE_COMMON',
  treasury_account_id: SENDER_ID,
  freeze_default: false,
  memo: '',
  pause_status: 'NOT_APPLICABLE',
  created_timestamp: '1706745600.000000000',
});

const makeNftTokenInfo = () => ({
  token_id: TOKEN_ID_NFT,
  name: 'MyNFT',
  symbol: 'NFT',
  decimals: '0',
  total_supply: '100',
  max_supply: '1000',
  type: 'NON_FUNGIBLE_UNIQUE',
  treasury_account_id: SENDER_ID,
  freeze_default: false,
  memo: '',
  pause_status: 'NOT_APPLICABLE',
  created_timestamp: '1706745600.000000000',
});

const TREASURY_ACCOUNT_ENTITY_ID = '0.0.123456';

const makeArgs = (
  api: ReturnType<typeof makeApiMocks>['api'],
  args?: Record<string, unknown>,
): CommandHandlerArgs => ({
  args: {
    account: 'treasury-account',
    index: [1],
    ...args,
  },
  api,
  state: api.state,
  config: api.config,
  logger: makeLogger(),
});

const makeSuccessApiMocks = (
  pendingAirdrops: ReturnType<typeof makeFtAirdropItem>[],
) => {
  const getTokenInfo = jest.fn().mockImplementation((tokenId: string) => {
    if (tokenId === TOKEN_ID_NFT) return Promise.resolve(makeNftTokenInfo());
    return Promise.resolve(makeFtTokenInfo());
  });

  return makeApiMocks({
    tokens: {
      createClaimAirdropTransaction: jest.fn().mockReturnValue(MOCK_CLAIM_TX),
    },
    txExecute: {
      execute: jest
        .fn()
        .mockResolvedValue(makeTransactionResult({ success: true })),
    },
    mirror: {
      getPendingAirdrops: jest.fn().mockResolvedValue({
        airdrops: pendingAirdrops,
        links: { next: null },
      }),
      getTokenInfo,
    },
  });
};

describe('tokenClaimAirdrop', () => {
  describe('success scenarios', () => {
    test('should claim a single FT airdrop by index', async () => {
      const { api } = makeSuccessApiMocks([makeFtAirdropItem()]);

      const result = await tokenClaimAirdrop(makeArgs(api, { index: [1] }));

      const output = assertOutput(result.result, TokenClaimAirdropOutputSchema);
      expect(output.receiverAccountId).toBe(TREASURY_ACCOUNT_ENTITY_ID);
      expect(output.claimed).toHaveLength(1);
      expect(output.claimed[0].type).toBe('FUNGIBLE');
      expect(output.claimed[0].tokenId).toBe(TOKEN_ID_FT);
      expect(output.claimed[0].tokenName).toBe('FungibleToken');
      expect(output.claimed[0].tokenSymbol).toBe('FT');
      expect(output.claimed[0].senderId).toBe(SENDER_ID);
      expect(output.claimed[0].amount).toBe(1000);
    });

    test('should claim a single NFT airdrop by index', async () => {
      const { api } = makeSuccessApiMocks([makeNftAirdropItem()]);

      const result = await tokenClaimAirdrop(makeArgs(api, { index: [1] }));

      const output = assertOutput(result.result, TokenClaimAirdropOutputSchema);
      expect(output.claimed).toHaveLength(1);
      expect(output.claimed[0].type).toBe('NFT');
      expect(output.claimed[0].tokenId).toBe(TOKEN_ID_NFT);
      expect(output.claimed[0].serialNumber).toBe(42);
      expect(output.claimed[0].amount).toBeUndefined();
    });

    test('should claim mixed FT and NFT airdrops by indices', async () => {
      const { api } = makeSuccessApiMocks([
        makeFtAirdropItem(),
        makeNftAirdropItem(),
      ]);

      const result = await tokenClaimAirdrop(makeArgs(api, { index: [1, 2] }));

      const output = assertOutput(result.result, TokenClaimAirdropOutputSchema);
      expect(output.claimed).toHaveLength(2);
      expect(output.claimed[0].type).toBe('FUNGIBLE');
      expect(output.claimed[1].type).toBe('NFT');
    });

    test('should claim second airdrop when index is 2', async () => {
      const { api } = makeSuccessApiMocks([
        makeFtAirdropItem({ token_id: TOKEN_ID_FT, amount: 500 }),
        makeNftAirdropItem(),
      ]);

      const result = await tokenClaimAirdrop(makeArgs(api, { index: [2] }));

      const output = assertOutput(result.result, TokenClaimAirdropOutputSchema);
      expect(output.claimed).toHaveLength(1);
      expect(output.claimed[0].type).toBe('NFT');
    });

    test('should build claim transaction with correct items', async () => {
      const { api } = makeSuccessApiMocks([makeFtAirdropItem()]);

      await tokenClaimAirdrop(makeArgs(api, { index: [1] }));

      expect(api.token.createClaimAirdropTransaction).toHaveBeenCalledWith({
        items: [
          {
            tokenId: TOKEN_ID_FT,
            senderAccountId: SENDER_ID,
            receiverAccountId: TREASURY_ACCOUNT_ENTITY_ID,
            serialNumber: undefined,
          },
        ],
      });
    });

    test('should deduplicate token info fetches for same token', async () => {
      const getTokenInfo = jest.fn().mockResolvedValue(makeFtTokenInfo());
      const { api } = makeApiMocks({
        tokens: {
          createClaimAirdropTransaction: jest
            .fn()
            .mockReturnValue(MOCK_CLAIM_TX),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(makeTransactionResult()),
        },
        mirror: {
          getPendingAirdrops: jest.fn().mockResolvedValue({
            airdrops: [
              makeFtAirdropItem({ amount: 100 }),
              makeFtAirdropItem({ amount: 200 }),
            ],
            links: { next: null },
          }),
          getTokenInfo,
        },
      });

      await tokenClaimAirdrop(makeArgs(api, { index: [1, 2] }));

      expect(getTokenInfo).toHaveBeenCalledTimes(1);
    });

    test('should resolve account alias', async () => {
      const { api } = makeSuccessApiMocks([makeFtAirdropItem()]);
      api.alias.resolve = jest.fn().mockImplementation((ref, type) => {
        if (type === AliasType.Account && ref === 'my-account') {
          return {
            entityId: MOCK_ACCOUNT_ID,
            publicKey: '302a300506032b6570032100' + 'a'.repeat(64),
            keyRefId: 'my-account-key-ref-id',
          };
        }
        return null;
      });

      const result = await tokenClaimAirdrop(
        makeArgs(api, { account: 'my-account', index: [1] }),
      );

      const output = assertOutput(result.result, TokenClaimAirdropOutputSchema);
      expect(output.receiverAccountId).toBe(MOCK_ACCOUNT_ID);
      expect(api.mirror.getPendingAirdrops).toHaveBeenCalledWith(
        MOCK_ACCOUNT_ID,
      );
    });
  });

  describe('error scenarios', () => {
    test('should throw ValidationError when index exceeds total airdrops', async () => {
      const { api } = makeSuccessApiMocks([makeFtAirdropItem()]);

      await expect(
        tokenClaimAirdrop(makeArgs(api, { index: [5] })),
      ).rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError when too many indices (>10)', async () => {
      const airdrops = Array.from({ length: 11 }, () => makeFtAirdropItem());
      const { api } = makeSuccessApiMocks(airdrops);

      await expect(
        tokenClaimAirdrop(
          makeArgs(api, { index: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }),
        ),
      ).rejects.toThrow(ValidationError);
    });

    test('should throw TransactionError when execute fails', async () => {
      const { api } = makeSuccessApiMocks([makeFtAirdropItem()]);
      (api.txExecute.execute as jest.Mock).mockResolvedValue(
        makeTransactionResult({ success: false }),
      );

      await expect(
        tokenClaimAirdrop(makeArgs(api, { index: [1] })),
      ).rejects.toThrow(TransactionError);
    });

    test('should throw NotFoundError for unknown alias', async () => {
      const { api } = makeApiMocks({
        alias: {
          resolve: jest.fn().mockReturnValue(null),
        },
      });

      await expect(
        tokenClaimAirdrop(makeArgs(api, { account: 'unknown-alias' })),
      ).rejects.toThrow();
    });
  });
});

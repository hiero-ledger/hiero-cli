import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import { MOCK_ACCOUNT_ID } from '@/__tests__/mocks/fixtures';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { NotFoundError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import {
  tokenPendingAirdrops,
  TokenPendingAirdropsOutputSchema,
} from '@/plugins/token/commands/pending-airdrops';

import { makeApiMocks, makeLogger } from './helpers/mocks';

const SENDER_ID = '0.0.9999';
const TOKEN_ID_FT = '0.0.2000';
const TOKEN_ID_NFT = '0.0.3000';

const mockFtAirdropItem = {
  amount: 1000,
  receiver_id: MOCK_ACCOUNT_ID,
  sender_id: SENDER_ID,
  serial_number: null,
  timestamp: { from: '1706745600.000000000', to: null },
  token_id: TOKEN_ID_FT,
};

const mockNftAirdropItem = {
  amount: 0,
  receiver_id: MOCK_ACCOUNT_ID,
  sender_id: SENDER_ID,
  serial_number: 42,
  timestamp: { from: '1706745600.000000000', to: null },
  token_id: TOKEN_ID_NFT,
};

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

const makeArgs = (
  api: ReturnType<typeof makeApiMocks>['api'],
  args?: Record<string, unknown>,
): CommandHandlerArgs => ({
  args: {
    account: MOCK_ACCOUNT_ID,
    showAll: false,
    ...args,
  },
  api,
  state: api.state,
  config: api.config,
  logger: makeLogger(),
});

describe('tokenPendingAirdrops', () => {
  describe('success scenarios', () => {
    test('should return FT airdrop entry', async () => {
      const { api } = makeApiMocks({
        mirror: {
          getPendingAirdrops: jest.fn().mockResolvedValue({
            airdrops: [mockFtAirdropItem],
            links: { next: null },
          }),
          getTokenInfo: jest.fn().mockResolvedValue(makeFtTokenInfo()),
        },
      });

      const result = await tokenPendingAirdrops(makeArgs(api));

      const output = assertOutput(
        result.result,
        TokenPendingAirdropsOutputSchema,
      );
      expect(output.account).toBe(MOCK_ACCOUNT_ID);
      expect(output.total).toBe(1);
      expect(output.hasMore).toBe(false);

      const entry = output.airdrops[0];
      expect(entry.type).toBe('FUNGIBLE');
      expect(entry.tokenId).toBe(TOKEN_ID_FT);
      expect(entry.tokenName).toBe('FungibleToken');
      expect(entry.tokenSymbol).toBe('FT');
      expect(entry.senderId).toBe(SENDER_ID);
      expect(entry.amount).toBe(1000);
      expect(entry.serialNumber).toBeUndefined();
    });

    test('should return NFT airdrop entry', async () => {
      const { api } = makeApiMocks({
        mirror: {
          getPendingAirdrops: jest.fn().mockResolvedValue({
            airdrops: [mockNftAirdropItem],
            links: { next: null },
          }),
          getTokenInfo: jest.fn().mockResolvedValue(makeNftTokenInfo()),
        },
      });

      const result = await tokenPendingAirdrops(makeArgs(api));

      const output = assertOutput(
        result.result,
        TokenPendingAirdropsOutputSchema,
      );
      expect(output.total).toBe(1);

      const entry = output.airdrops[0];
      expect(entry.type).toBe('NFT');
      expect(entry.tokenId).toBe(TOKEN_ID_NFT);
      expect(entry.tokenName).toBe('MyNFT');
      expect(entry.serialNumber).toBe(42);
      expect(entry.amount).toBeUndefined();
    });

    test('should return mixed FT and NFT airdrops', async () => {
      const getTokenInfo = jest
        .fn()
        .mockResolvedValueOnce(makeFtTokenInfo())
        .mockResolvedValueOnce(makeNftTokenInfo());

      const { api } = makeApiMocks({
        mirror: {
          getPendingAirdrops: jest.fn().mockResolvedValue({
            airdrops: [mockFtAirdropItem, mockNftAirdropItem],
            links: { next: null },
          }),
          getTokenInfo,
        },
      });

      const result = await tokenPendingAirdrops(makeArgs(api));

      const output = assertOutput(
        result.result,
        TokenPendingAirdropsOutputSchema,
      );
      expect(output.total).toBe(2);
      expect(output.airdrops[0].type).toBe('FUNGIBLE');
      expect(output.airdrops[1].type).toBe('NFT');
    });

    test('should return empty list when no airdrops', async () => {
      const { api } = makeApiMocks({
        mirror: {
          getPendingAirdrops: jest.fn().mockResolvedValue({
            airdrops: [],
            links: { next: null },
          }),
          getTokenInfo: jest.fn(),
        },
      });

      const result = await tokenPendingAirdrops(makeArgs(api));

      const output = assertOutput(
        result.result,
        TokenPendingAirdropsOutputSchema,
      );
      expect(output.total).toBe(0);
      expect(output.airdrops).toHaveLength(0);
      expect(output.hasMore).toBe(false);
    });

    test('should not fetch duplicate token info for same token_id', async () => {
      const getTokenInfo = jest.fn().mockResolvedValue(makeFtTokenInfo());
      const { api } = makeApiMocks({
        mirror: {
          getPendingAirdrops: jest.fn().mockResolvedValue({
            airdrops: [
              mockFtAirdropItem,
              { ...mockFtAirdropItem, amount: 500 },
            ],
            links: { next: null },
          }),
          getTokenInfo,
        },
      });

      await tokenPendingAirdrops(makeArgs(api));

      expect(getTokenInfo).toHaveBeenCalledTimes(1);
    });

    test('should paginate all pages when showAll is true', async () => {
      const getPendingAirdrops = jest
        .fn()
        .mockResolvedValueOnce({
          airdrops: [mockFtAirdropItem],
          links: {
            next: '/api/v1/accounts/0.0.5678/airdrops/pending?cursor=page2',
          },
        })
        .mockResolvedValueOnce({
          airdrops: [mockNftAirdropItem],
          links: { next: null },
        });

      const getTokenInfo = jest
        .fn()
        .mockResolvedValueOnce(makeFtTokenInfo())
        .mockResolvedValueOnce(makeNftTokenInfo());

      const { api } = makeApiMocks({
        mirror: { getPendingAirdrops, getTokenInfo },
      });

      const result = await tokenPendingAirdrops(
        makeArgs(api, { showAll: true }),
      );

      const output = assertOutput(
        result.result,
        TokenPendingAirdropsOutputSchema,
      );
      expect(output.total).toBe(2);
      expect(getPendingAirdrops).toHaveBeenCalledTimes(2);
      expect(getPendingAirdrops).toHaveBeenNthCalledWith(2, MOCK_ACCOUNT_ID, {
        limit: 100,
        cursor: 'page2',
      });
    });
  });

  describe('alias resolution', () => {
    test('should resolve account alias to entity ID', async () => {
      const { api } = makeApiMocks({
        mirror: {
          getPendingAirdrops: jest.fn().mockResolvedValue({
            airdrops: [],
            links: { next: null },
          }),
          getTokenInfo: jest.fn(),
        },
        alias: {
          resolve: jest.fn().mockImplementation((ref, type) => {
            if (type === AliasType.Account && ref === 'my-account') {
              return { entityId: MOCK_ACCOUNT_ID };
            }
            return null;
          }),
        },
      });

      const result = await tokenPendingAirdrops(
        makeArgs(api, { account: 'my-account' }),
      );

      const output = assertOutput(
        result.result,
        TokenPendingAirdropsOutputSchema,
      );
      expect(output.account).toBe(MOCK_ACCOUNT_ID);
      expect(api.mirror.getPendingAirdrops).toHaveBeenCalledWith(
        MOCK_ACCOUNT_ID,
      );
    });

    test('should throw NotFoundError for unknown alias', async () => {
      const { api } = makeApiMocks({
        alias: {
          resolve: jest.fn().mockReturnValue(null),
        },
      });

      await expect(
        tokenPendingAirdrops(makeArgs(api, { account: 'unknown-alias' })),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('error scenarios', () => {
    test('should propagate mirror node error', async () => {
      const { api } = makeApiMocks({
        mirror: {
          getPendingAirdrops: jest
            .fn()
            .mockRejectedValue(new Error('Network error')),
        },
      });

      await expect(tokenPendingAirdrops(makeArgs(api))).rejects.toThrow(
        'Network error',
      );
    });
  });
});

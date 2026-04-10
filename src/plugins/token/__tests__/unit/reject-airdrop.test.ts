import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import {
  MOCK_ACCOUNT_ID,
  MOCK_HEDERA_ENTITY_ID_1,
  MOCK_HEDERA_ENTITY_ID_2,
} from '@/__tests__/mocks/fixtures';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { TransactionError, ValidationError } from '@/core/errors';
import {
  tokenRejectAirdrop,
  TokenRejectAirdropOutputSchema,
} from '@/plugins/token/commands/reject-airdrop';

import { mockTransactionResults } from './helpers/fixtures';
import { makeApiMocks, makeLogger } from './helpers/mocks';

const SENDER_ID = '0.0.9999';
const TOKEN_ID_FT = MOCK_HEDERA_ENTITY_ID_1;
const TOKEN_ID_NFT = MOCK_HEDERA_ENTITY_ID_2;
const MOCK_TX_ID = '0.0.123@1234567890.123456789';

const makeFtAirdropItem = (overrides = {}) => ({
  amount: 100,
  receiver_id: MOCK_ACCOUNT_ID,
  sender_id: SENDER_ID,
  serial_number: null,
  timestamp: { from: '1706745600.000000000', to: null },
  token_id: TOKEN_ID_FT,
  ...overrides,
});

const makeNftAirdropItem = (overrides = {}) => ({
  amount: null,
  receiver_id: MOCK_ACCOUNT_ID,
  sender_id: SENDER_ID,
  serial_number: 5,
  timestamp: { from: '1706745600.000000000', to: null },
  token_id: TOKEN_ID_NFT,
  ...overrides,
});

const makeFtTokenInfo = () => ({
  token_id: TOKEN_ID_FT,
  name: 'TestFT',
  symbol: 'TFT',
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
  name: 'TestNFT',
  symbol: 'TNFT',
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

const makeSuccessResult = (overrides = {}) => ({
  ...mockTransactionResults.success,
  transactionId: MOCK_TX_ID,
  ...overrides,
});

const makeArgs = (
  api: ReturnType<typeof makeApiMocks>['api'],
  args?: Record<string, unknown>,
): CommandHandlerArgs => ({
  args: {
    account: MOCK_ACCOUNT_ID,
    index: '1',
    ...args,
  },
  api,
  state: api.state,
  config: api.config,
  logger: makeLogger(),
});

describe('tokenRejectAirdrop', () => {
  const mockRejectTransaction = { test: 'reject-transaction' };

  describe('success scenarios', () => {
    test('should reject a single FT airdrop by index', async () => {
      const { api, tokens } = makeApiMocks({
        tokens: {
          createRejectAirdropTransaction: jest
            .fn()
            .mockReturnValue(mockRejectTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(makeSuccessResult()),
        },
        mirror: {
          getPendingAirdrops: jest.fn().mockResolvedValue({
            airdrops: [makeFtAirdropItem()],
            links: { next: null },
          }),
          getTokenInfo: jest.fn().mockResolvedValue(makeFtTokenInfo()),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
      });

      const result = await tokenRejectAirdrop(makeArgs(api));

      const output = assertOutput(
        result.result,
        TokenRejectAirdropOutputSchema,
      );
      expect(output.ownerAccountId).toBe('0.0.100000');
      expect(output.transactionId).toBe(MOCK_TX_ID);
      expect(output.rejected).toHaveLength(1);

      const entry = output.rejected[0];
      expect(entry.type).toBe('FUNGIBLE');
      expect(entry.tokenId).toBe(TOKEN_ID_FT);
      expect(entry.tokenName).toBe('TestFT');
      expect(entry.tokenSymbol).toBe('TFT');
      expect(entry.senderId).toBe(SENDER_ID);
      expect(entry.amount).toBe(100);
      expect(entry.serialNumber).toBeUndefined();

      expect(tokens.createRejectAirdropTransaction).toHaveBeenCalledWith({
        ownerAccountId: '0.0.100000',
        items: [{ tokenId: TOKEN_ID_FT, serialNumber: undefined }],
      });
    });

    test('should reject a single NFT airdrop by index', async () => {
      const { api, tokens } = makeApiMocks({
        tokens: {
          createRejectAirdropTransaction: jest
            .fn()
            .mockReturnValue(mockRejectTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(makeSuccessResult()),
        },
        mirror: {
          getPendingAirdrops: jest.fn().mockResolvedValue({
            airdrops: [makeNftAirdropItem()],
            links: { next: null },
          }),
          getTokenInfo: jest.fn().mockResolvedValue(makeNftTokenInfo()),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
      });

      const result = await tokenRejectAirdrop(makeArgs(api));

      const output = assertOutput(
        result.result,
        TokenRejectAirdropOutputSchema,
      );
      expect(output.rejected).toHaveLength(1);

      const entry = output.rejected[0];
      expect(entry.type).toBe('NFT');
      expect(entry.tokenId).toBe(TOKEN_ID_NFT);
      expect(entry.tokenName).toBe('TestNFT');
      expect(entry.serialNumber).toBe(5);
      expect(entry.amount).toBeUndefined();

      expect(tokens.createRejectAirdropTransaction).toHaveBeenCalledWith({
        ownerAccountId: '0.0.100000',
        items: [{ tokenId: TOKEN_ID_NFT, serialNumber: 5 }],
      });
    });

    test('should reject mixed FT and NFT airdrops in one transaction', async () => {
      const getTokenInfo = jest
        .fn()
        .mockResolvedValueOnce(makeFtTokenInfo())
        .mockResolvedValueOnce(makeNftTokenInfo());

      const { api, tokens } = makeApiMocks({
        tokens: {
          createRejectAirdropTransaction: jest
            .fn()
            .mockReturnValue(mockRejectTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(makeSuccessResult()),
        },
        mirror: {
          getPendingAirdrops: jest.fn().mockResolvedValue({
            airdrops: [makeFtAirdropItem(), makeNftAirdropItem()],
            links: { next: null },
          }),
          getTokenInfo,
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
      });

      const result = await tokenRejectAirdrop(makeArgs(api, { index: '1,2' }));

      const output = assertOutput(
        result.result,
        TokenRejectAirdropOutputSchema,
      );
      expect(output.rejected).toHaveLength(2);
      expect(output.rejected[0].type).toBe('FUNGIBLE');
      expect(output.rejected[1].type).toBe('NFT');

      expect(tokens.createRejectAirdropTransaction).toHaveBeenCalledWith({
        ownerAccountId: '0.0.100000',
        items: [
          { tokenId: TOKEN_ID_FT, serialNumber: undefined },
          { tokenId: TOKEN_ID_NFT, serialNumber: 5 },
        ],
      });
    });

    test('should reject second airdrop when index is 2', async () => {
      const { api } = makeApiMocks({
        tokens: {
          createRejectAirdropTransaction: jest
            .fn()
            .mockReturnValue(mockRejectTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(makeSuccessResult()),
        },
        mirror: {
          getPendingAirdrops: jest.fn().mockResolvedValue({
            airdrops: [makeFtAirdropItem(), makeNftAirdropItem()],
            links: { next: null },
          }),
          getTokenInfo: jest.fn().mockResolvedValue(makeNftTokenInfo()),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
      });

      const result = await tokenRejectAirdrop(makeArgs(api, { index: '2' }));

      const output = assertOutput(
        result.result,
        TokenRejectAirdropOutputSchema,
      );
      expect(output.rejected).toHaveLength(1);
      expect(output.rejected[0].type).toBe('NFT');
      expect(output.rejected[0].serialNumber).toBe(5);
    });

    test('should not fetch duplicate token info for same token_id', async () => {
      const getTokenInfo = jest.fn().mockResolvedValue(makeFtTokenInfo());

      const { api } = makeApiMocks({
        tokens: {
          createRejectAirdropTransaction: jest
            .fn()
            .mockReturnValue(mockRejectTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(makeSuccessResult()),
        },
        mirror: {
          getPendingAirdrops: jest.fn().mockResolvedValue({
            airdrops: [makeFtAirdropItem(), makeFtAirdropItem({ amount: 200 })],
            links: { next: null },
          }),
          getTokenInfo,
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
      });

      await tokenRejectAirdrop(makeArgs(api, { index: '1,2' }));

      expect(getTokenInfo).toHaveBeenCalledTimes(1);
      expect(getTokenInfo).toHaveBeenCalledWith(TOKEN_ID_FT);
    });

    test('should resolve account alias to entity ID', async () => {
      const { api } = makeApiMocks({
        tokens: {
          createRejectAirdropTransaction: jest
            .fn()
            .mockReturnValue(mockRejectTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(makeSuccessResult()),
        },
        mirror: {
          getPendingAirdrops: jest.fn().mockResolvedValue({
            airdrops: [makeFtAirdropItem()],
            links: { next: null },
          }),
          getTokenInfo: jest.fn().mockResolvedValue(makeFtTokenInfo()),
        },
      });

      const result = await tokenRejectAirdrop(
        makeArgs(api, { account: 'my-account-alias' }),
      );

      const output = assertOutput(
        result.result,
        TokenRejectAirdropOutputSchema,
      );
      expect(output.ownerAccountId).toBe('0.0.100000');
      expect(api.mirror.getPendingAirdrops).toHaveBeenCalledWith('0.0.789012');
    });
  });

  describe('error scenarios', () => {
    test('should throw ValidationError when duplicate indices provided', async () => {
      const { api } = makeApiMocks({
        mirror: {
          getPendingAirdrops: jest.fn().mockResolvedValue({
            airdrops: [makeFtAirdropItem(), makeNftAirdropItem()],
            links: { next: null },
          }),
          getTokenInfo: jest.fn(),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
      });

      await expect(
        tokenRejectAirdrop(makeArgs(api, { index: '1,1' })),
      ).rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError when index exceeds total airdrops', async () => {
      const { api } = makeApiMocks({
        mirror: {
          getPendingAirdrops: jest.fn().mockResolvedValue({
            airdrops: [makeFtAirdropItem()],
            links: { next: null },
          }),
          getTokenInfo: jest.fn(),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
      });

      await expect(
        tokenRejectAirdrop(makeArgs(api, { index: '2' })),
      ).rejects.toThrow(ValidationError);
    });

    test('should throw ValidationError when more than 10 indices provided', async () => {
      const airdrops = Array.from({ length: 11 }, (_, i) =>
        makeFtAirdropItem({ amount: i + 1, token_id: `0.0.${2000 + i}` }),
      );

      const { api } = makeApiMocks({
        mirror: {
          getPendingAirdrops: jest.fn().mockResolvedValue({
            airdrops,
            links: { next: null },
          }),
          getTokenInfo: jest.fn(),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
      });

      await expect(
        tokenRejectAirdrop(makeArgs(api, { index: '1,2,3,4,5,6,7,8,9,10,11' })),
      ).rejects.toThrow(ValidationError);
    });

    test('should throw TransactionError when execute fails', async () => {
      const { api } = makeApiMocks({
        tokens: {
          createRejectAirdropTransaction: jest
            .fn()
            .mockReturnValue(mockRejectTransaction),
        },
        txExecute: {
          execute: jest
            .fn()
            .mockResolvedValue({ ...mockTransactionResults.failure }),
        },
        mirror: {
          getPendingAirdrops: jest.fn().mockResolvedValue({
            airdrops: [makeFtAirdropItem()],
            links: { next: null },
          }),
          getTokenInfo: jest.fn().mockResolvedValue(makeFtTokenInfo()),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
      });

      await expect(tokenRejectAirdrop(makeArgs(api))).rejects.toThrow(
        TransactionError,
      );
    });
  });
});

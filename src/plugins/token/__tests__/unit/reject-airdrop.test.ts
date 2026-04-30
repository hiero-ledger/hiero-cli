import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import { MOCK_HEDERA_ENTITY_ID_1 } from '@/__tests__/mocks/fixtures';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { TransactionError, ValidationError } from '@/core/errors';
import {
  tokenRejectAirdrop,
  TokenRejectAirdropOutputSchema,
} from '@/plugins/token/commands/reject-airdrop';

import { mockTransactionResults } from './helpers/fixtures';
import { makeApiMocks, makeLogger } from './helpers/mocks';

const TOKEN_ID = MOCK_HEDERA_ENTITY_ID_1;
const MOCK_TX_ID = '0.0.123@1234567890.123456789';

const makeFtTokenInfo = (overrides = {}) => ({
  token_id: TOKEN_ID,
  name: 'TestFT',
  symbol: 'TFT',
  decimals: '2',
  total_supply: '10000',
  max_supply: '0',
  type: 'FUNGIBLE_COMMON',
  treasury_account_id: '0.0.9999',
  freeze_default: false,
  memo: '',
  pause_status: 'NOT_APPLICABLE',
  created_timestamp: '1706745600.000000000',
  ...overrides,
});

const makeNftTokenInfo = (overrides = {}) => ({
  token_id: TOKEN_ID,
  name: 'TestNFT',
  symbol: 'TNFT',
  decimals: '0',
  total_supply: '100',
  max_supply: '1000',
  type: 'NON_FUNGIBLE_UNIQUE',
  treasury_account_id: '0.0.9999',
  freeze_default: false,
  memo: '',
  pause_status: 'NOT_APPLICABLE',
  created_timestamp: '1706745600.000000000',
  ...overrides,
});

const makeSuccessResult = (overrides = {}) => ({
  ...mockTransactionResults.success,
  transactionId: MOCK_TX_ID,
  ...overrides,
});

// 'admin-key' alias → entityId: 0.0.100000 (known to both alias and key resolver mocks)
const DEFAULT_ACCOUNT_ALIAS = 'admin-key';

const makeArgs = (
  api: ReturnType<typeof makeApiMocks>['api'],
  args?: Record<string, unknown>,
): CommandHandlerArgs => ({
  args: {
    owner: DEFAULT_ACCOUNT_ALIAS,
    token: TOKEN_ID,
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
    test('should reject a FT token (no serial required)', async () => {
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
          getTokenInfo: jest.fn().mockResolvedValue(makeFtTokenInfo()),
        },
      });

      const result = await tokenRejectAirdrop(makeArgs(api));

      const output = assertOutput(
        result.result,
        TokenRejectAirdropOutputSchema,
      );
      expect(output.ownerAccountId).toBe('0.0.100000');
      expect(output.transactionId).toBe(MOCK_TX_ID);
      expect(output.rejected.type).toBe('FUNGIBLE');
      expect(output.rejected.tokenId).toBe(TOKEN_ID);
      expect(output.rejected.tokenName).toBe('TestFT');
      expect(output.rejected.tokenSymbol).toBe('TFT');
      expect(output.rejected.serialNumbers).toBeUndefined();

      expect(tokens.createRejectAirdropTransaction).toHaveBeenCalledWith({
        ownerAccountId: '0.0.100000',
        items: [{ tokenId: TOKEN_ID, serialNumber: undefined }],
      });
    });

    test('should reject an NFT with a single serial', async () => {
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
          getTokenInfo: jest.fn().mockResolvedValue(makeNftTokenInfo()),
        },
      });

      const result = await tokenRejectAirdrop(makeArgs(api, { serial: '5' }));

      const output = assertOutput(
        result.result,
        TokenRejectAirdropOutputSchema,
      );
      expect(output.rejected.type).toBe('NFT');
      expect(output.rejected.tokenId).toBe(TOKEN_ID);
      expect(output.rejected.serialNumbers).toEqual([5]);

      expect(tokens.createRejectAirdropTransaction).toHaveBeenCalledWith({
        ownerAccountId: '0.0.100000',
        items: [{ tokenId: TOKEN_ID, serialNumber: 5 }],
      });
    });

    test('should reject an NFT with multiple serials', async () => {
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
          getTokenInfo: jest.fn().mockResolvedValue(makeNftTokenInfo()),
        },
      });

      const result = await tokenRejectAirdrop(
        makeArgs(api, { serial: '1,2,3' }),
      );

      const output = assertOutput(
        result.result,
        TokenRejectAirdropOutputSchema,
      );
      expect(output.rejected.type).toBe('NFT');
      expect(output.rejected.serialNumbers).toEqual([1, 2, 3]);

      expect(tokens.createRejectAirdropTransaction).toHaveBeenCalledWith({
        ownerAccountId: '0.0.100000',
        items: [
          { tokenId: TOKEN_ID, serialNumber: 1 },
          { tokenId: TOKEN_ID, serialNumber: 2 },
          { tokenId: TOKEN_ID, serialNumber: 3 },
        ],
      });
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
          getTokenInfo: jest.fn().mockResolvedValue(makeFtTokenInfo()),
        },
      });

      const result = await tokenRejectAirdrop(
        makeArgs(api, { owner: 'my-account-alias' }),
      );

      const output = assertOutput(
        result.result,
        TokenRejectAirdropOutputSchema,
      );
      expect(output.ownerAccountId).toBe('0.0.789012');
      expect(api.mirror.getTokenInfo).toHaveBeenCalledWith(TOKEN_ID);
    });
  });

  describe('error scenarios', () => {
    test('should throw ValidationError when NFT token is used without --serial', async () => {
      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue(makeNftTokenInfo()),
        },
      });

      await expect(tokenRejectAirdrop(makeArgs(api))).rejects.toThrow(
        ValidationError,
      );
      await expect(tokenRejectAirdrop(makeArgs(api))).rejects.toThrow(
        '--serial is required for NFT tokens',
      );
    });

    test('should throw ValidationError when FT token is used with --serial', async () => {
      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue(makeFtTokenInfo()),
        },
      });

      await expect(
        tokenRejectAirdrop(makeArgs(api, { serial: '1' })),
      ).rejects.toThrow(ValidationError);
      await expect(
        tokenRejectAirdrop(makeArgs(api, { serial: '1' })),
      ).rejects.toThrow('--serial is not applicable for fungible tokens');
    });

    test('should throw ValidationError when more than 10 serials provided (Zod max)', async () => {
      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue(makeNftTokenInfo()),
        },
      });

      await expect(
        tokenRejectAirdrop(
          makeArgs(api, { serial: '1,2,3,4,5,6,7,8,9,10,11' }),
        ),
      ).rejects.toThrow();
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
          getTokenInfo: jest.fn().mockResolvedValue(makeFtTokenInfo()),
        },
      });

      await expect(tokenRejectAirdrop(makeArgs(api))).rejects.toThrow(
        TransactionError,
      );
    });
  });
});

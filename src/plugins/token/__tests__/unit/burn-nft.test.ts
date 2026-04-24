import '@/core/utils/json-serialize';

import { assertOutput } from '@/__tests__/utils/assert-output';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { HederaTokenType } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import {
  tokenBurnNft,
  TokenBurnNftOutputSchema,
} from '@/plugins/token/commands/burn-nft';
import { TOKEN_NAMESPACE } from '@/plugins/token/constants';

import { makeBurnNftCommandArgs } from './helpers/fixtures';
import {
  makeApiMocks,
  makeBurnNftSuccessMocks,
  makeLogger,
  makeTransactionResult,
} from './helpers/mocks';

describe('tokenBurnNftHandler', () => {
  describe('success scenarios', () => {
    test('should burn single NFT serial', async () => {
      const { api } = makeBurnNftSuccessMocks();

      const logger = makeLogger();
      const args = makeBurnNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          serials: '1',
        },
      });

      const result = await tokenBurnNft(args);

      const output = assertOutput(result.result, TokenBurnNftOutputSchema);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');
      expect(output.serialNumbers).toEqual([1]);
      // 10 total - 1 burned = 9
      expect(output.newTotalSupply).toBe(9n);

      expect(api.token.createBurnNftTransaction).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        serialNumbers: [1],
      });
      expect(api.txExecute.execute).toHaveBeenCalledWith(expect.anything());
    });

    test('should burn multiple NFT serials', async () => {
      const { api } = makeBurnNftSuccessMocks();

      const logger = makeLogger();
      const args = makeBurnNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          serials: '1,2,3',
        },
      });

      const result = await tokenBurnNft(args);

      const output = assertOutput(result.result, TokenBurnNftOutputSchema);
      expect(output.serialNumbers).toEqual([1, 2, 3]);
      // 10 total - 3 burned = 7
      expect(output.newTotalSupply).toBe(7n);

      expect(api.token.createBurnNftTransaction).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        serialNumbers: [1, 2, 3],
      });
    });

    test('should log current and after supply', async () => {
      const supplyKeyPublicKey = 'supply-public-key';
      const { api } = makeBurnNftSuccessMocks({
        tokenInfo: {
          supply_key: { key: supplyKeyPublicKey },
          total_supply: '50',
        },
        supplyKeyPublicKey,
      });

      const logger = makeLogger();
      const args = makeBurnNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          serials: '5,10',
        },
      });

      const result = await tokenBurnNft(args);

      const output = assertOutput(result.result, TokenBurnNftOutputSchema);
      expect(output.newTotalSupply).toBe(48n);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Current supply: 50'),
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('after burn: 48'),
      );
    });
  });

  describe('error scenarios', () => {
    test('should handle token not found', async () => {
      const { api } = makeApiMocks({
        alias: {
          resolve: jest.fn().mockReturnValue(null),
        },
      });

      const logger = makeLogger();
      const args = makeBurnNftCommandArgs({
        api,
        logger,
        args: {
          token: 'nonexistent-token',
          serials: '1',
        },
      });

      await expect(tokenBurnNft(args)).rejects.toThrow(NotFoundError);
    });

    test('should handle FT token (not NFT) from mirror API', async () => {
      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({
            decimals: '2',
            supply_key: { key: 'supply-public-key' },
            total_supply: '1000000',
            max_supply: '0',
            type: 'FUNGIBLE_COMMON',
          }),
        },
        alias: {
          resolve: jest.fn().mockReturnValue(null),
        },
      });

      const logger = makeLogger();
      const args = makeBurnNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          serials: '1',
        },
      });

      await expect(tokenBurnNft(args)).rejects.toThrow(ValidationError);
    });

    test('should handle FT token from state', async () => {
      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({
            decimals: '2',
            supply_key: { key: 'supply-public-key' },
            total_supply: '1000000',
            max_supply: '0',
          }),
        },
        alias: {
          resolve: jest.fn().mockReturnValue(null),
        },
        state: {
          get: jest.fn().mockImplementation((namespace, key) => {
            if (namespace === TOKEN_NAMESPACE && key === '0.0.123456') {
              return {
                tokenId: '0.0.123456',
                name: 'Test FT',
                symbol: 'FT',
                decimals: 2,
                initialSupplyRaw: 0,
                supplyType: SupplyType.INFINITE,
                tokenType: HederaTokenType.FUNGIBLE_COMMON,
                maxSupplyRaw: undefined,
                treasuryId: '0.0.100000',
                memo: undefined,
              };
            }
            return null;
          }),
        },
      });

      const logger = makeLogger();
      const args = makeBurnNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          serials: '1',
        },
      });

      await expect(tokenBurnNft(args)).rejects.toThrow(ValidationError);
    });

    test('should handle token without supply key', async () => {
      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({
            decimals: '0',
            supply_key: null,
            total_supply: '10',
            max_supply: '0',
            type: 'NON_FUNGIBLE_UNIQUE',
          }),
        },
        alias: {
          resolve: jest.fn().mockReturnValue(null),
        },
      });

      const logger = makeLogger();
      const args = makeBurnNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          serials: '1',
        },
      });

      await expect(tokenBurnNft(args)).rejects.toThrow(ValidationError);
    });

    test('should handle transaction failure', async () => {
      const { api } = makeBurnNftSuccessMocks({
        signResult: makeTransactionResult({ success: false }),
      });

      const logger = makeLogger();
      const args = makeBurnNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          serials: '1',
        },
      });

      await expect(tokenBurnNft(args)).rejects.toThrow(TransactionError);
    });
  });
});

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
  tokenBurnFt,
  TokenBurnFtOutputSchema,
} from '@/plugins/token/commands/burn-ft';
import { TOKEN_NAMESPACE } from '@/plugins/token/constants';

import { makeBurnFtCommandArgs } from './helpers/fixtures';
import {
  makeApiMocks,
  makeBurnFtSuccessMocks,
  makeLogger,
  makeTransactionResult,
} from './helpers/mocks';

const defaultSupplyKey =
  '0.0.200000:3333333333333333333333333333333333333333333333333333333333333333';

describe('tokenBurnFtHandler', () => {
  describe('success scenarios', () => {
    test('should burn tokens with token ID and display units', async () => {
      const { api } = makeBurnFtSuccessMocks();

      const logger = makeLogger();
      const args = makeBurnFtCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          amount: '100',
          supplyKey: defaultSupplyKey,
        },
      });

      const result = await tokenBurnFt(args);

      const output = assertOutput(result.result, TokenBurnFtOutputSchema);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');
      // 100 display units with 2 decimals = 10000 base units
      expect(output.amount).toBe(10000n);
      // 1000000 total - 10000 burned = 990000
      expect(output.newTotalSupply).toBe(990000n);

      expect(api.token.createBurnFtTransaction).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        amount: 10000n,
      });
      expect(api.txExecute.execute).toHaveBeenCalledWith(expect.anything());
    });

    test('should burn tokens with base units (t suffix)', async () => {
      const { api } = makeBurnFtSuccessMocks();

      const logger = makeLogger();
      const args = makeBurnFtCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          amount: '5000t',
          supplyKey: defaultSupplyKey,
        },
      });

      const result = await tokenBurnFt(args);

      const output = assertOutput(result.result, TokenBurnFtOutputSchema);
      expect(output.amount).toBe(5000n);
      expect(output.newTotalSupply).toBe(995000n);

      expect(api.token.createBurnFtTransaction).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        amount: 5000n,
      });
    });

    test('should burn partial supply and log correctly', async () => {
      const supplyKeyPublicKey = 'supply-public-key';
      const { api } = makeBurnFtSuccessMocks({
        tokenInfo: {
          decimals: '2',
          supply_key: { key: supplyKeyPublicKey },
          total_supply: '5000000',
          max_supply: '0',
        },
        supplyKeyPublicKey,
      });

      const logger = makeLogger();
      const args = makeBurnFtCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          amount: '100',
          supplyKey: defaultSupplyKey,
        },
      });

      const result = await tokenBurnFt(args);

      const output = assertOutput(result.result, TokenBurnFtOutputSchema);
      expect(output.amount).toBe(10000n);
      expect(output.newTotalSupply).toBe(4990000n);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Current supply: 5000000'),
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('after burn: 4990000'),
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
      const args = makeBurnFtCommandArgs({
        api,
        logger,
        args: {
          token: 'nonexistent-token',
          amount: '100',
          supplyKey: defaultSupplyKey,
        },
      });

      await expect(tokenBurnFt(args)).rejects.toThrow(NotFoundError);
    });

    test('should handle token without supply key', async () => {
      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({
            decimals: '2',
            supply_key: null,
            total_supply: '1000000',
            max_supply: '0',
          }),
        },
        alias: {
          resolve: jest.fn().mockReturnValue(null),
        },
      });

      const logger = makeLogger();
      const args = makeBurnFtCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          amount: '100',
          supplyKey: defaultSupplyKey,
        },
      });

      await expect(tokenBurnFt(args)).rejects.toThrow(ValidationError);
    });

    test('should handle NFT token (from mirror API)', async () => {
      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({
            decimals: '0',
            supply_key: { key: 'supply-public-key' },
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
      const args = makeBurnFtCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          amount: '1t',
          supplyKey: defaultSupplyKey,
        },
      });

      await expect(tokenBurnFt(args)).rejects.toThrow(ValidationError);
    });

    test('should handle NFT token (from state)', async () => {
      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({
            decimals: '0',
            supply_key: { key: 'supply-public-key' },
            total_supply: '10',
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
                name: 'Test NFT',
                symbol: 'NFT',
                decimals: 0,
                initialSupplyRaw: 0,
                supplyType: SupplyType.INFINITE,
                tokenType: HederaTokenType.NON_FUNGIBLE_TOKEN,
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
      const args = makeBurnFtCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          amount: '1t',
          supplyKey: defaultSupplyKey,
        },
      });

      await expect(tokenBurnFt(args)).rejects.toThrow(ValidationError);
    });

    test('should handle burn amount exceeding total supply', async () => {
      const supplyKeyPublicKey = 'supply-public-key';
      const { api } = makeBurnFtSuccessMocks({
        tokenInfo: {
          decimals: '2',
          supply_key: { key: supplyKeyPublicKey },
          total_supply: '500',
          max_supply: '0',
        },
        supplyKeyPublicKey,
      });

      const logger = makeLogger();
      const args = makeBurnFtCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          amount: '100',
          supplyKey: defaultSupplyKey,
        },
      });

      // 100 display * 10^2 = 10000 base units > 500 total supply
      await expect(tokenBurnFt(args)).rejects.toThrow(ValidationError);
    });

    test('should handle zero amount', async () => {
      const { api } = makeBurnFtSuccessMocks();

      const logger = makeLogger();
      const args = makeBurnFtCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          amount: '0',
          supplyKey: defaultSupplyKey,
        },
      });

      await expect(tokenBurnFt(args)).rejects.toThrow(ValidationError);
    });

    test('should handle transaction failure', async () => {
      const { api } = makeBurnFtSuccessMocks({
        signResult: makeTransactionResult({ success: false }),
      });

      const logger = makeLogger();
      const args = makeBurnFtCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          amount: '100',
          supplyKey: defaultSupplyKey,
        },
      });

      await expect(tokenBurnFt(args)).rejects.toThrow(TransactionError);
    });
  });
});

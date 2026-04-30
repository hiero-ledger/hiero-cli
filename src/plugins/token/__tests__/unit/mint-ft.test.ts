import '@/core/utils/json-serialize';

import { ED25519_HEX_PUBLIC_KEY } from '@/__tests__/mocks/fixtures';
import { assertOutput } from '@/__tests__/utils/assert-output';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { MirrorNodeKeyType } from '@/core/services/mirrornode/types';
import { HederaTokenType } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import {
  tokenMintFt,
  TokenMintFtOutputSchema,
} from '@/plugins/token/commands/mint-ft';
import { TOKEN_NAMESPACE } from '@/plugins/token/constants';

import { makeMintFtCommandArgs } from './helpers/fixtures';
import {
  makeApiMocks,
  makeLogger,
  makeMintFtSuccessMocks,
  makeTransactionResult,
} from './helpers/mocks';

const defaultSupplyKey =
  '0.0.200000:3333333333333333333333333333333333333333333333333333333333333333';

describe('tokenMintFtHandler', () => {
  describe('success scenarios', () => {
    test('should mint tokens with token ID and display units', async () => {
      const { api } = makeMintFtSuccessMocks();

      const logger = makeLogger();
      const args = makeMintFtCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          amount: '100',
          supplyKey: [defaultSupplyKey],
        },
      });

      const result = await tokenMintFt(args);

      const output = assertOutput(result.result, TokenMintFtOutputSchema);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');

      expect(api.token.createMintTransaction).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        amount: 10000n,
      });
      expect(api.txExecute.execute).toHaveBeenCalledWith(expect.anything());
    });

    test('should mint tokens with base units (t suffix)', async () => {
      const { api } = makeMintFtSuccessMocks();

      const logger = makeLogger();
      const args = makeMintFtCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          amount: '5000t',
          supplyKey: [defaultSupplyKey],
        },
      });

      const result = await tokenMintFt(args);

      const output = assertOutput(result.result, TokenMintFtOutputSchema);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.amount).toBe(5000n);

      expect(api.token.createMintTransaction).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        amount: 5000n,
      });
    });

    test('should mint tokens for FINITE supply token below max supply', async () => {
      const supplyKeyPublicKey = ED25519_HEX_PUBLIC_KEY;
      const { api } = makeMintFtSuccessMocks({
        tokenInfo: {
          decimals: '2',
          supply_key: { key: supplyKeyPublicKey },
          total_supply: '5000000',
          max_supply: '10000000',
        },
        supplyKeyPublicKey,
      });

      const logger = makeLogger();
      const args = makeMintFtCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          amount: '100',
          supplyKey: [defaultSupplyKey],
        },
      });

      const result = await tokenMintFt(args);

      const output = assertOutput(result.result, TokenMintFtOutputSchema);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.amount).toBe(10000n);

      expect(api.token.createMintTransaction).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        amount: 10000n,
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Token has finite supply'),
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Current: 5000000'),
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Max: 10000000'),
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('After mint: 5010000'),
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
      const args = makeMintFtCommandArgs({
        api,
        logger,
        args: {
          token: 'nonexistent-token',
          amount: '100',
          supplyKey: [defaultSupplyKey],
        },
      });

      await expect(tokenMintFt(args)).rejects.toThrow(NotFoundError);
    });

    test('should handle token without supply key', async () => {
      const mockMintTransaction = { test: 'mint-transaction' };
      const { api } = makeApiMocks({
        tokens: {
          createMintTransaction: jest.fn().mockReturnValue(mockMintTransaction),
        },
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
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'supply-key-ref-id',
            publicKey: ED25519_HEX_PUBLIC_KEY,
          }),
        },
      });

      const logger = makeLogger();
      const args = makeMintFtCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          amount: '100',
          supplyKey: [defaultSupplyKey],
        },
      });

      await expect(tokenMintFt(args)).rejects.toThrow(ValidationError);
    });

    test('should handle NFT token (no decimals)', async () => {
      const mockMintTransaction = { test: 'mint-transaction' };
      const { api } = makeApiMocks({
        tokens: {
          createMintTransaction: jest.fn().mockReturnValue(mockMintTransaction),
        },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({
            decimals: '0',
            supply_key: {
              _type: MirrorNodeKeyType.ED25519,
              key: ED25519_HEX_PUBLIC_KEY,
            },
            total_supply: '0',
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
                treasuryId: '0.0.123456',
                adminPublicKey: expect.any(Object),
                supplyPublicKey: expect.any(Object),
                memo: undefined,
              };
            }
            return null;
          }),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'supply-key-ref-id',
            publicKey: ED25519_HEX_PUBLIC_KEY,
          }),
        },
      });

      const logger = makeLogger();
      const args = makeMintFtCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          amount: '100',
          supplyKey: [defaultSupplyKey],
        },
      });

      await expect(tokenMintFt(args)).rejects.toThrow(ValidationError);
    });

    test('should handle exceeding max supply for FINITE token', async () => {
      const supplyKeyPublicKey = ED25519_HEX_PUBLIC_KEY;
      const { api } = makeMintFtSuccessMocks({
        tokenInfo: {
          decimals: '2',
          supply_key: { key: supplyKeyPublicKey },
          total_supply: '9000000',
          max_supply: '10000000',
        },
        supplyKeyPublicKey,
      });

      const logger = makeLogger();
      const args = makeMintFtCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          amount: '15000',
          supplyKey: [defaultSupplyKey],
        },
      });

      await expect(tokenMintFt(args)).rejects.toThrow(ValidationError);
    });

    test('should handle zero amount', async () => {
      const { api } = makeMintFtSuccessMocks();

      const logger = makeLogger();
      const args = makeMintFtCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          amount: '0',
          supplyKey: [defaultSupplyKey],
        },
      });

      await expect(tokenMintFt(args)).rejects.toThrow(ValidationError);
    });

    test('should handle transaction failure', async () => {
      const { api } = makeMintFtSuccessMocks({
        signResult: makeTransactionResult({ success: false }),
      });

      const logger = makeLogger();
      const args = makeMintFtCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          amount: '100',
          supplyKey: [defaultSupplyKey],
        },
      });

      await expect(tokenMintFt(args)).rejects.toThrow(TransactionError);
    });
  });
});

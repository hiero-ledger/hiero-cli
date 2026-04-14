import '@/core/utils/json-serialize';

import { ED25519_HEX_PUBLIC_KEY } from '@/__tests__/mocks/fixtures';
import { assertOutput } from '@/__tests__/utils/assert-output';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { MirrorNodeKeyType } from '@/core/services/mirrornode/types';
import { HederaTokenType } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import {
  tokenMintNft,
  TokenMintNftOutputSchema,
} from '@/plugins/token/commands/mint-nft';
import { TOKEN_NAMESPACE } from '@/plugins/token/constants';

import { makeTokenMintNftCommandArgs } from './helpers/fixtures';
import {
  makeApiMocks,
  makeLogger,
  makeMintNftSuccessMocks,
  makeTransactionResult,
} from './helpers/mocks';

const defaultSupplyKey =
  '0.0.200000:3333333333333333333333333333333333333333333333333333333333333333';

describe('tokenMintNftHandler', () => {
  describe('success scenarios', () => {
    test('should mint NFT with token ID and metadata', async () => {
      const { api } = makeMintNftSuccessMocks();

      const logger = makeLogger();
      const args = makeTokenMintNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          metadata: 'Test NFT metadata',
          supplyKey: [defaultSupplyKey],
        },
      });

      const result = await tokenMintNft(args);

      const output = assertOutput(result.result, TokenMintNftOutputSchema);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');
      expect(output.serialNumber).toBe('1');

      const metadataBytes = new TextEncoder().encode('Test NFT metadata');
      expect(api.token.createMintTransaction).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        metadata: metadataBytes,
      });
      expect(api.txExecute.execute).toHaveBeenCalledWith(expect.anything());
    });

    test('should mint NFT for FINITE supply token below max supply', async () => {
      const supplyKeyPublicKey = ED25519_HEX_PUBLIC_KEY;
      const { api } = makeMintNftSuccessMocks({
        tokenInfo: {
          decimals: '0',
          type: 'NON_FUNGIBLE_TOKEN',
          supply_key: { key: supplyKeyPublicKey },
          total_supply: '5',
          max_supply: '10',
        },
        supplyKeyPublicKey,
      });

      const logger = makeLogger();
      const args = makeTokenMintNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          metadata: 'Test NFT',
          supplyKey: [defaultSupplyKey],
        },
      });

      const result = await tokenMintNft(args);

      const output = assertOutput(result.result, TokenMintNftOutputSchema);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.serialNumber).toBe('1');

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Token has finite supply'),
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Current: 5'),
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Max: 10'),
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('After mint: 6'),
      );
    });

    test('should mint NFT with token alias', async () => {
      const mockMintTransaction = { test: 'mint-nft-transaction' };
      const { api } = makeApiMocks({
        tokens: {
          createMintTransaction: jest.fn().mockReturnValue(mockMintTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue({
            ...makeTransactionResult({ success: true }),
            receipt: {
              status: {
                status: 'success' as const,
                transactionId: '0.0.123@1234567890.123456789',
              },
              serials: ['1'],
            },
          }),
        },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({
            decimals: '0',
            type: 'NON_FUNGIBLE_TOKEN',
            supply_key: {
              _type: MirrorNodeKeyType.ED25519,
              key: ED25519_HEX_PUBLIC_KEY,
            },
            total_supply: '0',
            max_supply: '0',
          }),
        },
        alias: {
          resolve: jest.fn().mockReturnValue({
            entityId: '0.0.123456',
            type: AliasType.Token,
            network: 'testnet',
            createdAt: '2024-01-01T00:00:00.000Z',
          }),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'supply-key-ref-id',
            publicKey: ED25519_HEX_PUBLIC_KEY,
          }),
        },
      });

      api.keyResolver.resolveSigningKey = jest.fn().mockResolvedValue({
        accountId: '0.0.200000',
        publicKey: ED25519_HEX_PUBLIC_KEY,
        keyRefId: 'supply-key-ref-id',
      });

      const logger = makeLogger();
      const args = makeTokenMintNftCommandArgs({
        api,
        logger,
        args: {
          token: 'my-nft-collection',
          metadata: 'Test NFT',
          supplyKey: [defaultSupplyKey],
        },
      });

      const result = await tokenMintNft(args);

      const output = assertOutput(result.result, TokenMintNftOutputSchema);
      expect(output.tokenId).toBe('0.0.123456');
      expect(api.alias.resolve).toHaveBeenCalledWith(
        'my-nft-collection',
        AliasType.Token,
        'testnet',
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
      const args = makeTokenMintNftCommandArgs({
        api,
        logger,
        args: {
          token: 'nonexistent-token',
          metadata: 'Test NFT',
          supplyKey: [defaultSupplyKey],
        },
      });

      await expect(tokenMintNft(args)).rejects.toThrow(NotFoundError);
    });

    test('should handle token without supply key', async () => {
      const mockMintTransaction = { test: 'mint-transaction' };
      const { api } = makeApiMocks({
        tokens: {
          createMintTransaction: jest.fn().mockReturnValue(mockMintTransaction),
        },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({
            decimals: '0',
            type: 'NON_FUNGIBLE_TOKEN',
            supply_key: null,
            total_supply: '0',
            max_supply: '0',
          }),
        },
        alias: {
          resolve: jest.fn().mockReturnValue(null),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'supply-key-ref-id',
            publicKey: 'supply-public-key',
          }),
        },
      });

      const logger = makeLogger();
      const args = makeTokenMintNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          metadata: 'Test NFT',
          supplyKey: [defaultSupplyKey],
        },
      });

      await expect(tokenMintNft(args)).rejects.toThrow(ValidationError);
    });

    test('should handle fungible token (not NFT)', async () => {
      const mockMintTransaction = { test: 'mint-transaction' };
      const { api } = makeApiMocks({
        tokens: {
          createMintTransaction: jest.fn().mockReturnValue(mockMintTransaction),
        },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({
            decimals: '2',
            type: 'FUNGIBLE_COMMON',
            supply_key: {
              _type: MirrorNodeKeyType.ED25519,
              key: ED25519_HEX_PUBLIC_KEY,
            },
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
                name: 'Test Token',
                symbol: 'FT',
                decimals: 2,
                initialSupplyRaw: 1000000,
                supplyType: SupplyType.INFINITE,
                tokenType: HederaTokenType.FUNGIBLE_COMMON,
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

      api.keyResolver.resolveSigningKey = jest.fn().mockResolvedValue({
        accountId: '0.0.200000',
        publicKey: ED25519_HEX_PUBLIC_KEY,
        keyRefId: 'supply-key-ref-id',
      });

      const logger = makeLogger();
      const args = makeTokenMintNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          metadata: 'Test NFT',
          supplyKey: [defaultSupplyKey],
        },
      });

      await expect(tokenMintNft(args)).rejects.toThrow(ValidationError);
    });

    test('should handle exceeding max supply for FINITE token', async () => {
      const supplyKeyPublicKey = ED25519_HEX_PUBLIC_KEY;
      const { api } = makeMintNftSuccessMocks({
        tokenInfo: {
          decimals: '0',
          type: 'NON_FUNGIBLE_TOKEN',
          supply_key: { key: supplyKeyPublicKey },
          total_supply: '10',
          max_supply: '10',
        },
        supplyKeyPublicKey,
      });

      const logger = makeLogger();
      const args = makeTokenMintNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          metadata: 'Test NFT',
          supplyKey: [defaultSupplyKey],
        },
      });

      await expect(tokenMintNft(args)).rejects.toThrow(ValidationError);
    });

    test('should handle metadata exceeding 100 bytes', async () => {
      const { api } = makeMintNftSuccessMocks();

      const logger = makeLogger();
      const longMetadata = 'a'.repeat(101);
      const args = makeTokenMintNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          metadata: longMetadata,
          supplyKey: [defaultSupplyKey],
        },
      });

      await expect(tokenMintNft(args)).rejects.toThrow(ValidationError);
    });

    test('should handle transaction failure', async () => {
      const { api } = makeMintNftSuccessMocks({
        signResult: makeTransactionResult({ success: false }),
      });

      const logger = makeLogger();
      const args = makeTokenMintNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          metadata: 'Test NFT',
          supplyKey: [defaultSupplyKey],
        },
      });

      await expect(tokenMintNft(args)).rejects.toThrow(TransactionError);
    });
  });
});

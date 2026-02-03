/**
 * Token Mint NFT Handler Unit Tests
 * Tests the non-fungible token minting functionality
 */
import '@/core/utils/json-serialize';

import { validateOutputSchema } from '@/__tests__/shared/output-validation.helper';
import { HederaTokenType, Status } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import {
  mintNft,
  type MintNftOutput,
  MintNftOutputSchema,
} from '@/plugins/token/commands/mint-nft';
import { TOKEN_NAMESPACE } from '@/plugins/token/manifest';

import { makeMintNftCommandArgs } from './helpers/fixtures';
import {
  makeApiMocks,
  makeLogger,
  makeMintNftSuccessMocks,
  makeTransactionResult,
} from './helpers/mocks';

const defaultSupplyKey =
  '0.0.200000:3333333333333333333333333333333333333333333333333333333333333333';

describe('mintNftHandler', () => {
  describe('success scenarios', () => {
    test('should mint NFT with token ID and metadata', async () => {
      const { api, mockMintTransaction } = makeMintNftSuccessMocks();

      const logger = makeLogger();
      const args = makeMintNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          metadata: 'Test NFT metadata',
          supplyKey: defaultSupplyKey,
        },
      });

      const result = await mintNft(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = validateOutputSchema<MintNftOutput>(
        result.outputJson!,
        MintNftOutputSchema,
      );
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');
      expect(output.serialNumber).toBe('1');

      const metadataBytes = new TextEncoder().encode('Test NFT metadata');
      expect(api.token.createMintTransaction).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        metadata: metadataBytes,
      });
      expect(api.txExecution.signAndExecuteWith).toHaveBeenCalledWith(
        mockMintTransaction,
        ['supply-key-ref-id'],
      );
    });

    test('should mint NFT for FINITE supply token below max supply', async () => {
      const supplyKeyPublicKey = 'supply-public-key';
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
      const args = makeMintNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          metadata: 'Test NFT',
          supplyKey: defaultSupplyKey,
        },
      });

      const result = await mintNft(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = validateOutputSchema<MintNftOutput>(
        result.outputJson!,
        MintNftOutputSchema,
      );
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
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue({
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
            supply_key: { key: 'supply-public-key' },
            total_supply: '0',
            max_supply: '0',
          }),
        },
        alias: {
          resolve: jest.fn().mockReturnValue({
            entityId: '0.0.123456',
            type: 'token',
            network: 'testnet',
            createdAt: '2024-01-01T00:00:00.000Z',
          }),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'supply-key-ref-id',
            publicKey: 'supply-public-key',
          }),
        },
      });

      api.keyResolver.getOrInitKey = jest.fn().mockResolvedValue({
        accountId: '0.0.200000',
        publicKey: 'supply-public-key',
        keyRefId: 'supply-key-ref-id',
      });

      const logger = makeLogger();
      const args = makeMintNftCommandArgs({
        api,
        logger,
        args: {
          token: 'my-nft-collection',
          metadata: 'Test NFT',
          supplyKey: defaultSupplyKey,
        },
      });

      const result = await mintNft(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = validateOutputSchema<MintNftOutput>(
        result.outputJson!,
        MintNftOutputSchema,
      );
      expect(output.tokenId).toBe('0.0.123456');
      expect(api.alias.resolve).toHaveBeenCalledWith(
        'my-nft-collection',
        'token',
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
      const args = makeMintNftCommandArgs({
        api,
        logger,
        args: {
          token: 'nonexistent-token',
          metadata: 'Test NFT',
          supplyKey: defaultSupplyKey,
        },
      });

      await expect(mintNft(args)).rejects.toThrow(
        'Token name "nonexistent-token" not found',
      );
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
      const args = makeMintNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          metadata: 'Test NFT',
          supplyKey: defaultSupplyKey,
        },
      });

      const result = await mintNft(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage).toContain('does not have a supply key');
      expect(result.errorMessage).toContain(
        'Cannot mint NFTs without a supply key',
      );
      expect(result.outputJson).toBeUndefined();
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
            supply_key: { key: 'supply-key' },
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
            publicKey: 'supply-public-key',
          }),
        },
      });

      const logger = makeLogger();
      const args = makeMintNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          metadata: 'Test NFT',
          supplyKey: defaultSupplyKey,
        },
      });

      const result = await mintNft(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage).toContain('is not an NFT');
      expect(result.errorMessage).toContain(
        'This command only supports NFT tokens',
      );
      expect(result.outputJson).toBeUndefined();
    });

    test('should handle exceeding max supply for FINITE token', async () => {
      const supplyKeyPublicKey = 'supply-public-key';
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
      const args = makeMintNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          metadata: 'Test NFT',
          supplyKey: defaultSupplyKey,
        },
      });

      const result = await mintNft(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage).toContain('Cannot mint NFT');
      expect(result.errorMessage).toContain('Current supply: 10');
      expect(result.errorMessage).toContain('Max supply: 10');
      expect(result.errorMessage).toContain('Would exceed by:');
      expect(result.outputJson).toBeUndefined();
    });

    test('should handle metadata exceeding 100 bytes', async () => {
      const { api } = makeMintNftSuccessMocks();

      const logger = makeLogger();
      // Create metadata string longer than 100 bytes
      const longMetadata = 'a'.repeat(101);
      const args = makeMintNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          metadata: longMetadata,
          supplyKey: defaultSupplyKey,
        },
      });

      const result = await mintNft(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage).toContain('Metadata exceeds maximum size');
      expect(result.errorMessage).toContain('100 bytes');
      expect(result.errorMessage).toContain('Current size: 101 bytes');
      expect(result.outputJson).toBeUndefined();
    });

    test('should handle transaction failure', async () => {
      const { api } = makeMintNftSuccessMocks({
        signResult: makeTransactionResult({ success: false }),
      });

      const logger = makeLogger();
      const args = makeMintNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          metadata: 'Test NFT',
          supplyKey: defaultSupplyKey,
        },
      });

      const result = await mintNft(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage).toBe('NFT mint transaction failed');
      expect(result.outputJson).toBeUndefined();
    });

    test('should handle mismatched supply key', async () => {
      const tokenSupplyKeyPublicKey = 'token-supply-key';
      const providedSupplyKeyPublicKey = 'different-supply-key';
      const mockMintTransaction = { test: 'mint-transaction' };

      const { api } = makeApiMocks({
        tokens: {
          createMintTransaction: jest.fn().mockReturnValue(mockMintTransaction),
        },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({
            decimals: '0',
            type: 'NON_FUNGIBLE_TOKEN',
            supply_key: { key: tokenSupplyKeyPublicKey },
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
            publicKey: providedSupplyKeyPublicKey,
          }),
        },
      });

      api.keyResolver.getOrInitKey = jest.fn().mockResolvedValue({
        accountId: '0.0.200000',
        publicKey: providedSupplyKeyPublicKey,
        keyRefId: 'supply-key-ref-id',
      });

      const logger = makeLogger();
      const args = makeMintNftCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          metadata: 'Test NFT',
          supplyKey: defaultSupplyKey,
        },
      });

      const result = await mintNft(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage).toContain(
        "The provided supply key does not match the token's supply key",
      );
      expect(result.errorMessage).toContain(
        'Token 0.0.123456 requires a different supply key',
      );
      expect(result.outputJson).toBeUndefined();
    });
  });
});

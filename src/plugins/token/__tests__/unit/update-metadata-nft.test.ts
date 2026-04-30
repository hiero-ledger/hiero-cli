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
  tokenUpdateNftMetadata,
  TokenUpdateNftMetadataOutputSchema,
} from '@/plugins/token/commands/update-metadata-nft';
import { TOKEN_NAMESPACE } from '@/plugins/token/constants';

import { makeUpdateNftMetadataCommandArgs } from './helpers/fixtures';
import {
  makeApiMocks,
  makeLogger,
  makeTransactionResult,
  makeUpdateNftMetadataSuccessMocks,
} from './helpers/mocks';

describe('tokenUpdateNftMetadataHandler', () => {
  describe('success scenarios', () => {
    test('should update metadata for single serial', async () => {
      const { api } = makeUpdateNftMetadataSuccessMocks();
      const logger = makeLogger();
      const args = makeUpdateNftMetadataCommandArgs({
        api,
        logger,
        args: { token: '0.0.123456', serials: '1', metadata: 'new-metadata' },
      });

      const result = await tokenUpdateNftMetadata(args);

      const output = assertOutput(
        result.result,
        TokenUpdateNftMetadataOutputSchema,
      );
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.serialNumbers).toEqual([1]);
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');

      expect(api.token.createUpdateNftMetadataTransaction).toHaveBeenCalledWith(
        {
          tokenId: '0.0.123456',
          serialNumbers: [1],
          metadata: expect.any(Uint8Array),
        },
      );
      expect(api.txExecute.execute).toHaveBeenCalledWith(expect.anything());
    });

    test('should update metadata for multiple serials', async () => {
      const { api } = makeUpdateNftMetadataSuccessMocks();
      const logger = makeLogger();
      const args = makeUpdateNftMetadataCommandArgs({
        api,
        logger,
        args: {
          token: '0.0.123456',
          serials: '1,2,3',
          metadata: 'new-metadata',
        },
      });

      const result = await tokenUpdateNftMetadata(args);

      const output = assertOutput(
        result.result,
        TokenUpdateNftMetadataOutputSchema,
      );
      expect(output.serialNumbers).toEqual([1, 2, 3]);

      expect(api.token.createUpdateNftMetadataTransaction).toHaveBeenCalledWith(
        {
          tokenId: '0.0.123456',
          serialNumbers: [1, 2, 3],
          metadata: expect.any(Uint8Array),
        },
      );
    });

    test('should resolve metadata key from KMS automatically when --metadata-key not provided', async () => {
      const { api, keyResolver } = makeUpdateNftMetadataSuccessMocks();
      const logger = makeLogger();
      const args = makeUpdateNftMetadataCommandArgs({
        api,
        logger,
        args: { metadataKey: [] },
      });

      await tokenUpdateNftMetadata(args);

      expect(keyResolver.resolveSigningKeys).toHaveBeenCalledWith(
        expect.objectContaining({
          explicitCredentials: [],
          signingKeyLabels: ['token:metadata'],
        }),
      );
    });

    test('should use explicit --metadata-key when provided', async () => {
      const { api, keyResolver } = makeUpdateNftMetadataSuccessMocks();
      const logger = makeLogger();
      const args = makeUpdateNftMetadataCommandArgs({
        api,
        logger,
        args: { metadataKey: ['my-account-alias'] },
      });

      await tokenUpdateNftMetadata(args);

      expect(keyResolver.resolveSigningKeys).toHaveBeenCalledWith(
        expect.objectContaining({
          explicitCredentials: expect.arrayContaining([
            expect.objectContaining({ rawValue: 'my-account-alias' }),
          ]),
        }),
      );
    });
  });

  describe('error scenarios', () => {
    test('should throw NotFoundError when token not found', async () => {
      const { api } = makeApiMocks({
        alias: { resolve: jest.fn().mockReturnValue(null) },
      });
      const logger = makeLogger();
      const args = makeUpdateNftMetadataCommandArgs({
        api,
        logger,
        args: { token: 'nonexistent-token' },
      });

      await expect(tokenUpdateNftMetadata(args)).rejects.toThrow(NotFoundError);
    });

    test('should throw ValidationError when token has no metadata key', async () => {
      const { api } = makeUpdateNftMetadataSuccessMocks({
        tokenInfo: { metadata_key: null },
      });
      api.keyResolver.resolveSigningKeys = jest
        .fn()
        .mockRejectedValue(new ValidationError('Token has no metadata key'));
      const logger = makeLogger();
      const args = makeUpdateNftMetadataCommandArgs({ api, logger });

      await expect(tokenUpdateNftMetadata(args)).rejects.toThrow(
        ValidationError,
      );
    });

    test('should throw ValidationError when token is not an NFT (by mirror)', async () => {
      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({
            decimals: '2',
            type: 'FUNGIBLE_COMMON',
            metadata_key: { key: 'some-key' },
          }),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
      });
      const logger = makeLogger();
      const args = makeUpdateNftMetadataCommandArgs({ api, logger });

      await expect(tokenUpdateNftMetadata(args)).rejects.toThrow(
        ValidationError,
      );
    });

    test('should throw ValidationError when token is not an NFT (by state)', async () => {
      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({
            decimals: '2',
            metadata_key: { key: 'some-key' },
          }),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
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
              };
            }
            return null;
          }),
        },
      });
      const logger = makeLogger();
      const args = makeUpdateNftMetadataCommandArgs({ api, logger });

      await expect(tokenUpdateNftMetadata(args)).rejects.toThrow(
        ValidationError,
      );
    });

    test('should throw TransactionError when transaction fails', async () => {
      const { api } = makeUpdateNftMetadataSuccessMocks({
        signResult: makeTransactionResult({ success: false }),
      });
      const logger = makeLogger();
      const args = makeUpdateNftMetadataCommandArgs({ api, logger });

      await expect(tokenUpdateNftMetadata(args)).rejects.toThrow(
        TransactionError,
      );
    });
  });
});

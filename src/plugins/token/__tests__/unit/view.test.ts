/**
 * Token View Handler Unit Tests
 * Tests the token view functionality for both Fungible and Non-Fungible tokens
 */
import { makeArgs } from '@/__tests__/mocks/mocks';
import {
  createMockNftInfo,
  createMockTokenInfo,
} from '@/core/services/mirrornode/__tests__/unit/mocks';
import { Status } from '@/core/shared/constants';
import { viewToken, type ViewTokenOutput } from '@/plugins/token/commands/view';

import { makeApiMocks, makeLogger } from './helpers/mocks';

describe('viewToken', () => {
  describe('Fungible Token - Default View', () => {
    it('should return FT info with decimals', async () => {
      const tokenId = '0.0.12345';
      const mockTokenInfo = createMockTokenInfo({
        token_id: tokenId,
        type: 'FUNGIBLE_COMMON',
        name: 'Test Fungible Token',
        symbol: 'TFT',
        decimals: '6',
        total_supply: '1000000',
        max_supply: '10000000',
        treasury: '0.0.9999',
        memo: 'Test token',
        created_timestamp: '2024-01-01T00:00:00.000Z',
      });

      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue(mockTokenInfo),
        },
      });

      const logger = makeLogger();
      const args = makeArgs(api, logger, { token: tokenId });

      const result = await viewToken(args);

      expect(result.status).toBe(Status.Success);
      expect(api.mirror.getTokenInfo).toHaveBeenCalledWith(tokenId);

      const output: ViewTokenOutput = JSON.parse(result.outputJson!);
      expect(output.tokenId).toBe(tokenId);
      expect(output.type).toBe('FUNGIBLE_COMMON');
      expect(output.decimals).toBe(6);
      expect(output.totalSupply).toBe('1000000');
      expect(output.nftSerial).toBeUndefined();
    });
  });

  describe('NFT Collection - Default View', () => {
    it('should return NFT collection info without decimals', async () => {
      const tokenId = '0.0.54321';
      const mockTokenInfo = createMockTokenInfo({
        token_id: tokenId,
        type: 'NON_FUNGIBLE_UNIQUE',
        name: 'Test NFT Collection',
        symbol: 'TNFT',
        decimals: '0',
        total_supply: '10',
        max_supply: '100',
        treasury: '0.0.8888',
      });

      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue(mockTokenInfo),
        },
      });

      const logger = makeLogger();
      const args = makeArgs(api, logger, { token: tokenId });

      const result = await viewToken(args);

      expect(result.status).toBe(Status.Success);

      const output: ViewTokenOutput = JSON.parse(result.outputJson!);
      expect(output.tokenId).toBe(tokenId);
      expect(output.type).toBe('NON_FUNGIBLE_UNIQUE');
      expect(output.totalSupply).toBe('10');
      expect(output.decimals).toBeUndefined();
      expect(output.nftSerial).toBeUndefined();
    });
  });

  describe('NFT Serial View - with --serial', () => {
    it('should return NFT collection + specific serial info', async () => {
      const tokenId = '0.0.54321';
      const serialNumber = 5;
      const mockTokenInfo = createMockTokenInfo({
        token_id: tokenId,
        type: 'NON_FUNGIBLE_UNIQUE',
        name: 'Test NFT Collection',
        symbol: 'TNFT',
        total_supply: '10',
      });
      const mockNftInfo = createMockNftInfo({
        token_id: tokenId,
        serial_number: serialNumber,
        account_id: '0.0.7777',
        metadata: 'SGVsbG8gV29ybGQ=', // "Hello World" in base64
        created_timestamp: '2024-06-15T10:30:00.000Z',
        deleted: false,
      });

      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue(mockTokenInfo),
          getNftInfo: jest.fn().mockResolvedValue(mockNftInfo),
        },
      });

      const logger = makeLogger();
      const args = makeArgs(api, logger, { token: tokenId, serial: '5' });

      const result = await viewToken(args);

      expect(result.status).toBe(Status.Success);
      expect(api.mirror.getTokenInfo).toHaveBeenCalledWith(tokenId);
      expect(api.mirror.getNftInfo).toHaveBeenCalledWith(tokenId, serialNumber);

      const output: ViewTokenOutput = JSON.parse(result.outputJson!);
      expect(output.tokenId).toBe(tokenId);
      expect(output.type).toBe('NON_FUNGIBLE_UNIQUE');
      expect(output.nftSerial).toBeDefined();
      expect(output.nftSerial!.serialNumber).toBe(serialNumber);
      expect(output.nftSerial!.owner).toBe('0.0.7777');
      expect(output.nftSerial!.metadata).toBe('Hello World');
      expect(output.nftSerial!.metadataRaw).toBe('SGVsbG8gV29ybGQ=');
      expect(output.nftSerial!.deleted).toBe(false);
    });

    it('should handle missing metadata', async () => {
      const tokenId = '0.0.54321';
      const mockTokenInfo = createMockTokenInfo({
        token_id: tokenId,
        type: 'NON_FUNGIBLE_UNIQUE',
      });
      const mockNftInfo = createMockNftInfo({
        metadata: undefined,
      });

      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue(mockTokenInfo),
          getNftInfo: jest.fn().mockResolvedValue(mockNftInfo),
        },
      });

      const logger = makeLogger();
      const args = makeArgs(api, logger, { token: tokenId, serial: '1' });

      const result = await viewToken(args);

      expect(result.status).toBe(Status.Success);
      const output: ViewTokenOutput = JSON.parse(result.outputJson!);
      expect(output.nftSerial!.metadata).toBeUndefined();
      expect(output.nftSerial!.metadataRaw).toBeUndefined();
    });
  });

  describe('Error: FT with --serial', () => {
    it('should return error when trying to query serial on Fungible Token', async () => {
      const tokenId = '0.0.12345';
      const mockTokenInfo = createMockTokenInfo({
        token_id: tokenId,
        type: 'FUNGIBLE_COMMON',
      });

      const getNftInfoMock = jest.fn();
      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue(mockTokenInfo),
          getNftInfo: getNftInfoMock,
        },
      });

      const logger = makeLogger();
      const args = makeArgs(api, logger, { token: tokenId, serial: '5' });

      const result = await viewToken(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('is not an NFT collection');
      expect(result.errorMessage).toContain('FUNGIBLE_COMMON');
      expect(getNftInfoMock).not.toHaveBeenCalled();
    });
  });

  describe('Error: Invalid serial number', () => {
    it('should return error for non-numeric serial', async () => {
      const tokenId = '0.0.54321';
      const mockTokenInfo = createMockTokenInfo({
        token_id: tokenId,
        type: 'NON_FUNGIBLE_UNIQUE',
      });

      const getNftInfoMock = jest.fn();
      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue(mockTokenInfo),
          getNftInfo: getNftInfoMock,
        },
      });

      const logger = makeLogger();
      const args = makeArgs(api, logger, { token: tokenId, serial: 'abc' });

      const result = await viewToken(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Invalid serial number');
      expect(result.errorMessage).toContain('abc');
      expect(getNftInfoMock).not.toHaveBeenCalled();
    });

    it('should return error for zero serial number', async () => {
      const tokenId = '0.0.54321';
      const mockTokenInfo = createMockTokenInfo({
        token_id: tokenId,
        type: 'NON_FUNGIBLE_UNIQUE',
      });

      const getNftInfoMock = jest.fn();
      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue(mockTokenInfo),
          getNftInfo: getNftInfoMock,
        },
      });

      const logger = makeLogger();
      const args = makeArgs(api, logger, { token: tokenId, serial: '0' });

      const result = await viewToken(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Invalid serial number');
      expect(getNftInfoMock).not.toHaveBeenCalled();
    });

    it('should return error for negative serial number', async () => {
      const tokenId = '0.0.54321';
      const mockTokenInfo = createMockTokenInfo({
        token_id: tokenId,
        type: 'NON_FUNGIBLE_UNIQUE',
      });

      const getNftInfoMock = jest.fn();
      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue(mockTokenInfo),
          getNftInfo: getNftInfoMock,
        },
      });

      const logger = makeLogger();
      const args = makeArgs(api, logger, { token: tokenId, serial: '-5' });

      const result = await viewToken(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Invalid serial number');
      expect(getNftInfoMock).not.toHaveBeenCalled();
    });
  });

  describe('Error: Serial not found (404)', () => {
    it('should return error when NFT serial does not exist', async () => {
      const tokenId = '0.0.54321';
      const mockTokenInfo = createMockTokenInfo({
        token_id: tokenId,
        type: 'NON_FUNGIBLE_UNIQUE',
      });

      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue(mockTokenInfo),
          getNftInfo: jest
            .fn()
            .mockRejectedValue(
              new Error('Failed to get NFT info: 404 Not Found'),
            ),
        },
      });

      const logger = makeLogger();
      const args = makeArgs(api, logger, { token: tokenId, serial: '999999' });

      const result = await viewToken(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to view token');
      expect(api.mirror.getNftInfo).toHaveBeenCalledWith(tokenId, 999999);
    });
  });

  describe('Token Alias Resolution', () => {
    it('should resolve fungible token alias to ID', async () => {
      const tokenAlias = 'my-token';
      const resolvedTokenId = '0.0.12345';
      const mockTokenInfo = createMockTokenInfo({
        token_id: resolvedTokenId,
        type: 'FUNGIBLE_COMMON',
        name: 'Test Token',
        symbol: 'TST',
      });

      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue(mockTokenInfo),
        },
      });

      const logger = makeLogger();
      const args = makeArgs(api, logger, { token: tokenAlias });

      const result = await viewToken(args);

      expect(result.status).toBe(Status.Success);
      expect(api.alias.resolve).toHaveBeenCalledWith(
        tokenAlias,
        'token',
        'testnet',
      );
      expect(api.mirror.getTokenInfo).toHaveBeenCalledWith(resolvedTokenId);

      const output: ViewTokenOutput = JSON.parse(result.outputJson!);
      expect(output.tokenId).toBe(resolvedTokenId);
    });

    it('should resolve NFT collection alias to ID', async () => {
      const tokenAlias = 'my-nft-collection';
      const resolvedTokenId = '0.0.54321';
      const mockTokenInfo = createMockTokenInfo({
        token_id: resolvedTokenId,
        type: 'NON_FUNGIBLE_UNIQUE',
        name: 'Test NFT',
        symbol: 'TNFT',
      });

      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue(mockTokenInfo),
        },
      });

      const logger = makeLogger();
      const args = makeArgs(api, logger, { token: tokenAlias });

      const result = await viewToken(args);

      expect(result.status).toBe(Status.Success);
      expect(api.alias.resolve).toHaveBeenCalledWith(
        tokenAlias,
        'token',
        'testnet',
      );
      expect(api.mirror.getTokenInfo).toHaveBeenCalledWith(resolvedTokenId);

      const output: ViewTokenOutput = JSON.parse(result.outputJson!);
      expect(output.tokenId).toBe(resolvedTokenId);
    });

    it('should resolve NFT alias with serial number', async () => {
      const tokenAlias = 'my-nft-collection';
      const resolvedTokenId = '0.0.54321';
      const serialNumber = 5;
      const mockTokenInfo = createMockTokenInfo({
        token_id: resolvedTokenId,
        type: 'NON_FUNGIBLE_UNIQUE',
      });
      const mockNftInfo = createMockNftInfo({
        token_id: resolvedTokenId,
        serial_number: serialNumber,
        account_id: '0.0.7777',
      });

      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue(mockTokenInfo),
          getNftInfo: jest.fn().mockResolvedValue(mockNftInfo),
        },
      });

      const logger = makeLogger();
      const args = makeArgs(api, logger, {
        token: tokenAlias,
        serial: '5',
      });

      const result = await viewToken(args);

      expect(result.status).toBe(Status.Success);
      expect(api.alias.resolve).toHaveBeenCalledWith(
        tokenAlias,
        'token',
        'testnet',
      );
      expect(api.mirror.getTokenInfo).toHaveBeenCalledWith(resolvedTokenId);
      expect(api.mirror.getNftInfo).toHaveBeenCalledWith(
        resolvedTokenId,
        serialNumber,
      );

      const output: ViewTokenOutput = JSON.parse(result.outputJson!);
      expect(output.tokenId).toBe(resolvedTokenId);
      expect(output.nftSerial?.serialNumber).toBe(serialNumber);
    });

    it('should return error when alias does not exist', async () => {
      const tokenAlias = 'non-existent-token';

      const { api } = makeApiMocks({
        alias: {
          resolve: jest.fn().mockReturnValue(null),
        },
      });

      const logger = makeLogger();
      const args = makeArgs(api, logger, { token: tokenAlias });

      const result = await viewToken(args);

      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to view token');
      expect(result.errorMessage).toContain('Token name');
      expect(result.errorMessage).toContain(tokenAlias);
      expect(result.errorMessage).toContain('not found for network');
      expect(api.alias.resolve).toHaveBeenCalledWith(
        tokenAlias,
        'token',
        'testnet',
      );
    });

    it('should still work with direct token ID', async () => {
      const tokenId = '0.0.12345';
      const mockTokenInfo = createMockTokenInfo({
        token_id: tokenId,
        type: 'FUNGIBLE_COMMON',
      });

      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue(mockTokenInfo),
        },
      });

      const logger = makeLogger();
      const args = makeArgs(api, logger, { token: tokenId });

      const result = await viewToken(args);

      expect(result.status).toBe(Status.Success);
      expect(api.mirror.getTokenInfo).toHaveBeenCalledWith(tokenId);

      const output: ViewTokenOutput = JSON.parse(result.outputJson!);
      expect(output.tokenId).toBe(tokenId);
    });
  });
});

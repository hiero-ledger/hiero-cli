/**
 * Token Create From File Handler Unit Tests
 * Tests the token creation from file functionality of the token plugin
 */
import type { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { createTokenFromFile } from '../../commands/createFromFile';
import type { CreateTokenFromFileOutput } from '../../commands/createFromFile';
import { ZustandTokenStateHelper } from '../../zustand-state-helper';
import { Status } from '../../../../core/shared/constants';
import { makeLogger, makeApiMocks } from './helpers/mocks';
import {
  validTokenFile,
  infiniteSupplyTokenFile,
  mockTransactions,
  mockTransactionResults,
  expectedTokenTransactionParamsFromFile,
} from './helpers/fixtures';
import * as fs from 'fs/promises';
import * as path from 'path';
import '../../../../core/utils/json-serialize';

// ADR-003 compliance: handlers now return CommandExecutionResult instead of calling process.exit()

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  access: jest.fn(),
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn(),
  resolve: jest.fn(),
}));

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;
const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('createTokenFromFileHandler', () => {
  const mockTokenTransaction = mockTransactions.token;
  const mockSignResult = mockTransactionResults.success;

  const createMockApi = () => {
    return makeApiMocks({
      tokenTransactions: {
        createTokenTransaction: jest.fn().mockReturnValue(mockTokenTransaction),
        createTokenAssociationTransaction: jest.fn(),
      },
      signing: {
        signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
      },
      kms: {
        importPrivateKey: jest.fn().mockReturnValue({
          keyRefId: 'treasury-key-ref-id',
          publicKey: 'treasury-key',
        }),
      },
    });
  };
  beforeEach(() => {
    MockedHelper.mockClear();
    MockedHelper.mockImplementation(() => ({
      saveToken: jest.fn().mockResolvedValue(undefined),
    }));
    mockFs.readFile.mockClear();
    mockFs.access.mockClear();
    mockPath.join.mockClear();
    mockPath.resolve.mockClear();
  });

  describe('success scenarios', () => {
    test('should create token from valid file', async () => {
      // Arrange
      const mockAddToken = jest.fn();
      MockedHelper.mockImplementation(() => ({
        saveToken: mockAddToken,
      }));

      mockFs.readFile.mockResolvedValue(JSON.stringify(validTokenFile));
      mockFs.access.mockResolvedValue(undefined); // File exists
      mockPath.resolve.mockReturnValue('/resolved/path/to/test.json');

      const mockAssociationTransaction = mockTransactions.association;
      const mockAssociationResult =
        mockTransactionResults.successWithAssociation;

      const { api, tokenTransactions, signing } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTokenTransaction),
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockImplementation((transaction) => {
            if (transaction === mockTokenTransaction) {
              return Promise.resolve(mockSignResult);
            }
            if (transaction === mockAssociationTransaction) {
              return Promise.resolve(mockAssociationResult);
            }
            return Promise.resolve(mockTransactionResults.failure);
          }),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'treasury-key-ref-id',
            publicKey: 'treasury-key',
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: 'test',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await createTokenFromFile(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();
      expect(result.errorMessage).toBeUndefined();

      const output: CreateTokenFromFileOutput = JSON.parse(result.outputJson!);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.name).toBe('TestToken');
      expect(output.symbol).toBe('TEST');
      expect(output.treasuryId).toBe('0.0.123456');
      expect(output.decimals).toBe(2);
      expect(output.initialSupply).toBe('1000');
      expect(output.supplyType).toBe('FINITE');
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');
      expect(output.network).toBe('testnet');

      expect(mockFs.readFile).toHaveBeenCalledWith(
        '/resolved/path/to/test.json',
        'utf-8',
      );
      expect(mockPath.join).not.toHaveBeenCalled();
      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalledWith(
        expectedTokenTransactionParamsFromFile,
      );
      expect(signing.signAndExecuteWith).toHaveBeenCalledWith(
        mockTokenTransaction,
        ['treasury-key-ref-id'],
      );
      expect(mockAddToken).toHaveBeenCalled();
    });

    test('should create token from file using full path', async () => {
      const mockAddToken = jest.fn();
      MockedHelper.mockImplementation(() => ({
        saveToken: mockAddToken,
      }));

      const fullPath = './custom/path/token.json';
      mockFs.readFile.mockResolvedValue(JSON.stringify(validTokenFile));
      mockFs.access.mockResolvedValue(undefined);

      const { api } = createMockApi();

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: fullPath,
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      const result = await createTokenFromFile(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();
      expect(result.errorMessage).toBeUndefined();

      const output: CreateTokenFromFileOutput = JSON.parse(result.outputJson!);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.name).toBe('TestToken');
      expect(output.symbol).toBe('TEST');

      expect(mockFs.readFile).toHaveBeenCalledWith(fullPath, 'utf-8');
      expect(mockAddToken).toHaveBeenCalled();
    });

    test('should create token from file using absolute path', async () => {
      const mockAddToken = jest.fn();
      MockedHelper.mockImplementation(() => ({
        saveToken: mockAddToken,
      }));

      const absolutePath = '/absolute/path/to/token.json';
      mockFs.readFile.mockResolvedValue(JSON.stringify(validTokenFile));
      mockFs.access.mockResolvedValue(undefined);

      const { api } = createMockApi();

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: absolutePath,
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      const result = await createTokenFromFile(args);

      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();
      expect(result.errorMessage).toBeUndefined();

      const output: CreateTokenFromFileOutput = JSON.parse(result.outputJson!);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.name).toBe('TestToken');
      expect(output.symbol).toBe('TEST');

      expect(mockFs.readFile).toHaveBeenCalledWith(absolutePath, 'utf-8');
      expect(mockAddToken).toHaveBeenCalled();
    });

    test('should handle infinite supply type', async () => {
      // Arrange
      const mockAddToken = jest.fn();
      const mockTokenTransaction = mockTransactions.token;
      const mockSignResult = mockTransactionResults.success;

      MockedHelper.mockImplementation(() => ({
        saveToken: mockAddToken,
      }));

      mockFs.readFile.mockResolvedValue(
        JSON.stringify(infiniteSupplyTokenFile),
      );
      mockFs.access.mockResolvedValue(undefined);
      mockPath.resolve.mockReturnValue('/resolved/path/to/test.json');

      const { api, tokenTransactions } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTokenTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'treasury-key-ref-id',
            publicKey: 'treasury-key',
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: 'test',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await createTokenFromFile(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();
      expect(result.errorMessage).toBeUndefined();

      const output: CreateTokenFromFileOutput = JSON.parse(result.outputJson!);
      expect(output.name).toBe('TestToken');
      expect(output.symbol).toBe('TEST');
      expect(output.treasuryId).toBe('0.0.123456');
      expect(output.decimals).toBe(2);
      expect(output.initialSupply).toBe('1000');
      expect(output.supplyType).toBe('INFINITE');

      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalledWith({
        name: 'TestToken',
        symbol: 'TEST',
        treasuryId: '0.0.123456',
        decimals: 2,
        initialSupplyRaw: 1000n,
        supplyType: 'INFINITE',
        maxSupplyRaw: 0n,
        adminKey: 'admin-key',
        customFees: [
          {
            type: 'fixed',
            amount: 10,
            unitType: 'HBAR',
            collectorId: '0.0.999999',
            exempt: undefined,
          },
        ],
      });
    });

    test('should process associations after token creation', async () => {
      // Arrange
      const mockAddToken = jest.fn();
      const mockTokenTransaction = mockTransactions.token;
      const _mockAssociationTransaction = mockTransactions.association;
      const mockSignResult = mockTransactionResults.success;

      MockedHelper.mockImplementation(() => ({
        saveToken: mockAddToken,
      }));

      mockFs.readFile.mockResolvedValue(JSON.stringify(validTokenFile));
      mockFs.access.mockResolvedValue(undefined);
      mockPath.resolve.mockReturnValue('/resolved/path/to/test.json');

      const { api, tokenTransactions } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTokenTransaction),
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(_mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'treasury-key-ref-id',
            publicKey: 'treasury-key',
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: 'test',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await createTokenFromFile(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();
      expect(result.errorMessage).toBeUndefined();

      const output: CreateTokenFromFileOutput = JSON.parse(result.outputJson!);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.associations).toBeDefined();
      expect(output.associations.length).toBeGreaterThan(0);

      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalledWith({
        tokenId: '0.0.123456', // This would be the actual token ID from the transaction result
        accountId: '0.0.789012',
      });
    });
  });

  describe('file handling scenarios', () => {
    test('should handle file not found', async () => {
      // Arrange
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      mockPath.resolve.mockReturnValue('/resolved/path/to/token.test.json');

      const { api } = makeApiMocks({});
      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: 'nonexistent',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act & Assert
      const result = await createTokenFromFile(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to create token from file');
      expect(result.outputJson).toBeUndefined();

      // ADR-003 compliance: logger.error calls are no longer expected
      // expect(logger.error).toHaveBeenCalledWith(
      //   expect.stringContaining('❌ Failed to create token from file:'),
      // );
    });

    test('should handle file read error', async () => {
      // Arrange
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));
      mockPath.resolve.mockReturnValue('/resolved/path/to/token.test.json');

      const { api } = makeApiMocks({});
      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: 'test',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act & Assert
      const result = await createTokenFromFile(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to create token from file');
      expect(result.outputJson).toBeUndefined();

      // ADR-003 compliance: logger.error calls are no longer expected
      // expect(logger.error).toHaveBeenCalledWith(
      //   expect.stringContaining('❌ Failed to create token from file:'),
      // );
    });

    test('should handle invalid JSON', async () => {
      // Arrange
      mockFs.readFile.mockResolvedValue('invalid json content');
      mockFs.access.mockResolvedValue(undefined);
      mockPath.resolve.mockReturnValue('/resolved/path/to/token.test.json');

      const { api } = makeApiMocks({});
      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: 'test',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act & Assert
      const result = await createTokenFromFile(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to create token from file');
      expect(result.outputJson).toBeUndefined();

      // ADR-003 compliance: logger.error calls are no longer expected
      // expect(logger.error).toHaveBeenCalledWith(
      //   expect.stringContaining('❌ Failed to create token from file:'),
      // );
    });
  });

  describe('validation scenarios', () => {
    test('should handle missing required fields', async () => {
      // Arrange
      const invalidFile = {
        // name missing
        symbol: 'TEST',
        decimals: 2,
        supplyType: 'finite',
        initialSupply: 1000,
        treasury: {
          accountId: '0.0.123456',
          key: 'treasury-key',
        },
        keys: {
          adminKey: 'admin-key',
        },
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidFile));
      mockFs.access.mockResolvedValue(undefined);
      mockPath.resolve.mockReturnValue('/resolved/path/to/token.test.json');

      const { api } = makeApiMocks({});
      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: 'test',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act & Assert
      const result = await createTokenFromFile(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Invalid token definition file');
      expect(result.outputJson).toBeUndefined();

      // ADR-003 compliance: logger.error calls are no longer expected
      // expect(logger.error).toHaveBeenCalledWith('Token file validation failed');
    });

    test('should handle invalid account ID format', async () => {
      // Arrange
      const invalidFile = {
        ...validTokenFile,
        treasury: {
          accountId: 'invalid-account-id',
          key: 'treasury-key',
        },
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidFile));
      mockFs.access.mockResolvedValue(undefined);
      mockPath.resolve.mockReturnValue('/resolved/path/to/token.test.json');

      const { api } = makeApiMocks({});
      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: 'test',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act & Assert
      const result = await createTokenFromFile(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Invalid token definition file');
      expect(result.outputJson).toBeUndefined();

      // ADR-003 compliance: logger.error calls are no longer expected
      // expect(logger.error).toHaveBeenCalledWith('Token file validation failed');
    });

    test('should handle invalid supply type', async () => {
      // Arrange
      const invalidFile = {
        ...validTokenFile,
        supplyType: 'invalid-type',
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidFile));
      mockFs.access.mockResolvedValue(undefined);
      mockPath.resolve.mockReturnValue('/resolved/path/to/token.test.json');

      const { api } = makeApiMocks({});
      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: 'test',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act & Assert
      const result = await createTokenFromFile(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Invalid token definition file');
      expect(result.outputJson).toBeUndefined();

      // ADR-003 compliance: logger.error calls are no longer expected
      // expect(logger.error).toHaveBeenCalledWith('Token file validation failed');
    });

    test('should handle negative initial supply', async () => {
      // Arrange
      const invalidFile = {
        ...validTokenFile,
        initialSupply: -100,
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidFile));
      mockFs.access.mockResolvedValue(undefined);
      mockPath.resolve.mockReturnValue('/resolved/path/to/token.test.json');

      const { api } = makeApiMocks({});
      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: 'test',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act & Assert
      const result = await createTokenFromFile(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Invalid token definition file');
      expect(result.outputJson).toBeUndefined();

      // ADR-003 compliance: logger.error calls are no longer expected
      // expect(logger.error).toHaveBeenCalledWith('Token file validation failed');
    });
  });

  describe('error scenarios', () => {
    test('should handle token creation failure', async () => {
      // Arrange
      const mockAddToken = jest.fn();
      const mockTokenTransaction = mockTransactions.token;
      const mockSignResult = mockTransactionResults.failure;

      MockedHelper.mockImplementation(() => ({
        saveToken: mockAddToken,
      }));

      mockFs.readFile.mockResolvedValue(JSON.stringify(validTokenFile));
      mockFs.access.mockResolvedValue(undefined);
      mockPath.resolve.mockReturnValue('/resolved/path/to/test.json');

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTokenTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'treasury-key-ref-id',
            publicKey: 'treasury-key',
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: 'test',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act & Assert
      const result = await createTokenFromFile(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to create token from file');
      expect(result.outputJson).toBeUndefined();

      // ADR-003 compliance: logger.error calls are no longer expected
      // expect(logger.error).toHaveBeenCalledWith(
      //   expect.stringContaining('❌ Failed to create token from file:'),
      // );
    });

    test('should handle association failure gracefully', async () => {
      // Arrange
      const mockAddToken = jest.fn();
      const mockTokenTransaction = mockTransactions.token;
      const mockSignResult = mockTransactionResults.success;

      MockedHelper.mockImplementation(() => ({
        saveToken: mockAddToken,
      }));

      mockFs.readFile.mockResolvedValue(JSON.stringify(validTokenFile));
      mockFs.access.mockResolvedValue(undefined);
      mockPath.resolve.mockReturnValue('/resolved/path/to/test.json');

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTokenTransaction),
          createTokenAssociationTransaction: jest
            .fn()
            .mockImplementation(() => {
              throw new Error('Association failed');
            }),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'treasury-key-ref-id',
            publicKey: 'treasury-key',
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: 'test',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await createTokenFromFile(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();
      expect(result.errorMessage).toBeUndefined();

      const output: CreateTokenFromFileOutput = JSON.parse(result.outputJson!);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.name).toBe('TestToken');

      // Should continue despite association failure
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Failed to associate account 0.0.789012:'),
      );
    });
  });

  describe('logging and debugging', () => {
    test('should log file processing details', async () => {
      // Arrange
      const mockAddToken = jest.fn();
      const mockTokenTransaction = mockTransactions.token;
      const mockSignResult = mockTransactionResults.success;

      MockedHelper.mockImplementation(() => ({
        saveToken: mockAddToken,
      }));

      mockFs.readFile.mockResolvedValue(JSON.stringify(validTokenFile));
      mockFs.access.mockResolvedValue(undefined);
      mockPath.resolve.mockReturnValue('/resolved/path/to/test.json');

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTokenTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'treasury-key-ref-id',
            publicKey: 'treasury-key',
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: 'test',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await createTokenFromFile(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();
      expect(result.errorMessage).toBeUndefined();

      const output: CreateTokenFromFileOutput = JSON.parse(result.outputJson!);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.name).toBe('TestToken');

      expect(logger.log).toHaveBeenCalledWith('Creating token from file: test');
      expect(logger.log).toHaveBeenCalledWith(
        '🔑 Using treasury key for signing transaction',
      );
    });
  });
});

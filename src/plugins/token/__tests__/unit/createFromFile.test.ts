import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import '@/core/utils/json-serialize';

import * as fs from 'fs/promises';
import * as path from 'path';

import { makeConfigMock, makeStateMock } from '@/__tests__/mocks/mocks';
import { FileError, StateError } from '@/core/errors';
import { HederaTokenType } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import {
  type CreateFungibleTokenFromFileOutput,
  createTokenFromFile,
} from '@/plugins/token/commands/create-ft-from-file';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import {
  expectedTokenTransactionParamsFromFile,
  infiniteSupplyTokenFile,
  mockKeys,
  mockTransactionResults,
  mockTransactions,
  validTokenFile,
} from './helpers/fixtures';
import { makeApiMocks, makeLogger } from './helpers/mocks';

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
        findByPublicKey: jest.fn().mockImplementation((key) => {
          if (key === 'admin-key') return 'admin-key-ref-id';
          return undefined;
        }),
        getPublicKey: jest.fn().mockImplementation((keyRefId) => {
          if (keyRefId === 'admin-key-ref-id') return 'admin-public-key';
          return 'mock-public-key';
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
          importPrivateKey: jest
            .fn()
            .mockImplementation((keyType, privateKey) => {
              if (privateKey === mockKeys.treasury) {
                return {
                  keyRefId: 'treasury-key-ref-id',
                  publicKey: 'treasury-key',
                };
              }
              if (privateKey === mockKeys.admin) {
                return { keyRefId: 'admin-key-ref-id', publicKey: 'admin-key' };
              }
              return {
                keyRefId: 'mock-key-ref-id',
                publicKey: 'mock-public-key',
              };
            }),
          findByPublicKey: jest.fn().mockImplementation((key) => {
            if (key === 'admin-key') return 'admin-key-ref-id';
            return undefined;
          }),
          getPublicKey: jest.fn().mockImplementation((keyRefId) => {
            if (keyRefId === 'admin-key-ref-id') return 'admin-public-key';
            return 'mock-public-key';
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: 'test',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act
      const result = await createTokenFromFile(args);
      const output = result.result as CreateFungibleTokenFromFileOutput;
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.name).toBe('TestToken');
      expect(output.symbol).toBe('TEST');
      expect(output.treasuryId).toBe('0.0.123456');
      expect(output.decimals).toBe(2);
      expect(output.initialSupply).toBe('1000');
      expect(output.supplyType).toBe(SupplyType.FINITE);
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
        ['admin-key-ref-id', 'treasury-key-ref-id'],
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
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      const result = await createTokenFromFile(args);

      const output = result.result as CreateFungibleTokenFromFileOutput;
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
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      const result = await createTokenFromFile(args);

      const output = result.result as CreateFungibleTokenFromFileOutput;
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
          importPrivateKey: jest
            .fn()
            .mockImplementation((keyType, privateKey) => {
              if (privateKey === mockKeys.treasury) {
                return {
                  keyRefId: 'treasury-key-ref-id',
                  publicKey: 'treasury-key',
                };
              }
              if (privateKey === mockKeys.admin) {
                return { keyRefId: 'admin-key-ref-id', publicKey: 'admin-key' };
              }
              return {
                keyRefId: 'mock-key-ref-id',
                publicKey: 'mock-public-key',
              };
            }),
          findByPublicKey: jest.fn().mockImplementation((key) => {
            if (key === 'admin-key') return 'admin-key-ref-id';
            return undefined;
          }),
          getPublicKey: jest.fn().mockImplementation((keyRefId) => {
            if (keyRefId === 'admin-key-ref-id') return 'admin-public-key';
            return 'mock-public-key';
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: 'test',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act
      const result = await createTokenFromFile(args);
      const output = result.result as CreateFungibleTokenFromFileOutput;
      expect(output.name).toBe('TestToken');
      expect(output.symbol).toBe('TEST');
      expect(output.treasuryId).toBe('0.0.123456');
      expect(output.decimals).toBe(2);
      expect(output.initialSupply).toBe('1000');
      expect(output.supplyType).toBe(SupplyType.INFINITE);

      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalledWith({
        name: 'TestToken',
        symbol: 'TEST',
        treasuryId: '0.0.123456',
        decimals: 2,
        initialSupplyRaw: 1000n,
        supplyType: SupplyType.INFINITE,
        maxSupplyRaw: 0n,
        adminPublicKey: expect.any(Object),
        customFees: [
          {
            type: 'fixed',
            amount: 10,
            unitType: 'HBAR',
            collectorId: '0.0.999999',
            exempt: undefined,
          },
        ],
        memo: 'Test token created from file',
        tokenType: HederaTokenType.FUNGIBLE_COMMON,
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
          importPrivateKey: jest
            .fn()
            .mockImplementation((keyType, privateKey) => {
              if (privateKey === mockKeys.treasury) {
                return {
                  keyRefId: 'treasury-key-ref-id',
                  publicKey: 'treasury-key',
                };
              }
              if (privateKey === mockKeys.admin) {
                return { keyRefId: 'admin-key-ref-id', publicKey: 'admin-key' };
              }
              return {
                keyRefId: 'mock-key-ref-id',
                publicKey: 'mock-public-key',
              };
            }),
          findByPublicKey: jest.fn().mockImplementation((key) => {
            if (key === 'admin-key') return 'admin-key-ref-id';
            return undefined;
          }),
          getPublicKey: jest.fn().mockImplementation((keyRefId) => {
            if (keyRefId === 'admin-key-ref-id') return 'admin-public-key';
            return 'mock-public-key';
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: 'test',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act
      const result = await createTokenFromFile(args);
      const output = result.result as CreateFungibleTokenFromFileOutput;
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
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act & Assert
      await expect(createTokenFromFile(args)).rejects.toThrow(FileError);
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
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act & Assert
      await expect(createTokenFromFile(args)).rejects.toThrow(FileError);
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
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act & Assert
      await expect(createTokenFromFile(args)).rejects.toThrow(FileError);
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
        treasury: '0.0.123456:treasury-key',
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
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act & Assert
      await expect(createTokenFromFile(args)).rejects.toThrow(
        'Invalid token definition file',
      );
    });

    test('should handle invalid treasury format', async () => {
      // Arrange
      const invalidFile = {
        ...validTokenFile,
        treasuryKey: '', // Empty treasury string
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
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act & Assert
      await expect(createTokenFromFile(args)).rejects.toThrow(
        'Invalid token definition file',
      );
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
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act & Assert
      await expect(createTokenFromFile(args)).rejects.toThrow(
        'Invalid token definition file',
      );
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
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act & Assert
      await expect(createTokenFromFile(args)).rejects.toThrow(
        'Invalid token definition file',
      );
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
          importPrivateKey: jest
            .fn()
            .mockImplementation((keyType, privateKey) => {
              if (privateKey === mockKeys.treasury) {
                return {
                  keyRefId: 'treasury-key-ref-id',
                  publicKey: 'treasury-key',
                };
              }
              if (privateKey === mockKeys.admin) {
                return { keyRefId: 'admin-key-ref-id', publicKey: 'admin-key' };
              }
              return {
                keyRefId: 'mock-key-ref-id',
                publicKey: 'mock-public-key',
              };
            }),
          findByPublicKey: jest.fn().mockImplementation((key) => {
            if (key === 'admin-key') return 'admin-key-ref-id';
            return undefined;
          }),
          getPublicKey: jest.fn().mockImplementation((keyRefId) => {
            if (keyRefId === 'admin-key-ref-id') return 'admin-public-key';
            return 'mock-public-key';
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: 'test',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act & Assert
      await expect(createTokenFromFile(args)).rejects.toThrow(StateError);
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
          importPrivateKey: jest
            .fn()
            .mockImplementation((keyType, privateKey) => {
              if (privateKey === mockKeys.treasury) {
                return {
                  keyRefId: 'treasury-key-ref-id',
                  publicKey: 'treasury-key',
                };
              }
              if (privateKey === mockKeys.admin) {
                return { keyRefId: 'admin-key-ref-id', publicKey: 'admin-key' };
              }
              return {
                keyRefId: 'mock-key-ref-id',
                publicKey: 'mock-public-key',
              };
            }),
          findByPublicKey: jest.fn().mockImplementation((key) => {
            if (key === 'admin-key') return 'admin-key-ref-id';
            return undefined;
          }),
          getPublicKey: jest.fn().mockImplementation((keyRefId) => {
            if (keyRefId === 'admin-key-ref-id') return 'admin-public-key';
            return 'mock-public-key';
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: 'test',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act
      const result = await createTokenFromFile(args);
      const output = result.result as CreateFungibleTokenFromFileOutput;
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
          importPrivateKey: jest
            .fn()
            .mockImplementation((keyType, privateKey) => {
              if (privateKey === mockKeys.treasury) {
                return {
                  keyRefId: 'treasury-key-ref-id',
                  publicKey: 'treasury-key',
                };
              }
              if (privateKey === mockKeys.admin) {
                return { keyRefId: 'admin-key-ref-id', publicKey: 'admin-key' };
              }
              return {
                keyRefId: 'mock-key-ref-id',
                publicKey: 'mock-public-key',
              };
            }),
          findByPublicKey: jest.fn().mockImplementation((key) => {
            if (key === 'admin-key') return 'admin-key-ref-id';
            return undefined;
          }),
          getPublicKey: jest.fn().mockImplementation((keyRefId) => {
            if (keyRefId === 'admin-key-ref-id') return 'admin-public-key';
            return 'mock-public-key';
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: 'test',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act
      const result = await createTokenFromFile(args);
      const output = result.result as CreateFungibleTokenFromFileOutput;
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.name).toBe('TestToken');

      expect(logger.info).toHaveBeenCalledWith(
        'Creating fungible token from file: test',
      );
      expect(logger.info).toHaveBeenCalledWith(
        '🔑 Resolved admin key for signing',
      );
    });
  });
});

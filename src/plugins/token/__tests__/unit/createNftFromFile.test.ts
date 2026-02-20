import '@/core/utils/json-serialize';

import * as fs from 'fs/promises';
import * as path from 'path';

import { FileError, StateError } from '@/core/errors';
import { HederaTokenType } from '@/core/shared/constants';
import { SupportedNetwork } from '@/core/types/shared.types';
import {
  createNftFromFile,
  type CreateNftFromFileOutput,
} from '@/plugins/token/commands/create-nft-from-file';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import {
  expectedNftTransactionParamsFromFile,
  infiniteSupplyNftFile,
  invalidNftFileFiniteWithoutMaxSupply,
  invalidNftFileInfiniteWithMaxSupply,
  invalidNftFileMissingSupplyKey,
  invalidNftFileWithInvalidSupplyType,
  invalidNftFileWithoutName,
  invalidNftFileWithoutTreasury,
  makeCreateNftFromFileCommandArgs,
  mockAccountIds,
  mockKeys,
  mockTransactionResults,
  mockTransactions,
  validNftTokenFile,
} from './helpers/fixtures';
import { makeApiMocks, makeLogger } from './helpers/mocks';

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  access: jest.fn(),
}));

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

describe('createNftFromFileHandler', () => {
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
          keyRefId: 'supply-key-ref-id',
          publicKey: 'supply-key',
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
    test('should create NFT from valid file', async () => {
      const mockAddToken = jest.fn();
      MockedHelper.mockImplementation(() => ({
        saveToken: mockAddToken,
      }));

      mockFs.readFile.mockResolvedValue(JSON.stringify(validNftTokenFile));
      mockFs.access.mockResolvedValue(undefined);
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
              if (privateKey === mockKeys.supply) {
                return {
                  keyRefId: 'supply-key-ref-id',
                  publicKey: 'supply-key',
                };
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
      const args = makeCreateNftFromFileCommandArgs({
        api,
        logger,
        args: {
          file: 'test',
        },
      });

      const result = await createNftFromFile(args);

      const output = result.result as CreateNftFromFileOutput;
      expect(output.tokenId).toBe(mockTransactionResults.success.tokenId);
      expect(output.name).toBe(validNftTokenFile.name);
      expect(output.symbol).toBe(validNftTokenFile.symbol);
      expect(output.treasuryId).toBe(mockAccountIds.treasury);
      expect(output.supplyType).toBe(
        validNftTokenFile.supplyType.toUpperCase(),
      );
      expect(output.transactionId).toBe(
        mockTransactionResults.success.transactionId,
      );
      expect(output.network).toBe(SupportedNetwork.TESTNET);

      expect(mockFs.readFile).toHaveBeenCalledWith(
        '/resolved/path/to/test.json',
        'utf-8',
      );
      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalledWith(
        expectedNftTransactionParamsFromFile,
      );
      expect(signing.signAndExecuteWith).toHaveBeenCalledWith(
        mockTokenTransaction,
        ['admin-key-ref-id', 'treasury-key-ref-id', 'supply-key-ref-id'],
      );
      expect(mockAddToken).toHaveBeenCalled();
    });

    test('should create NFT from file using full path', async () => {
      const mockAddToken = jest.fn();
      MockedHelper.mockImplementation(() => ({
        saveToken: mockAddToken,
      }));

      const fullPath = './custom/path/nft.json';
      mockFs.readFile.mockResolvedValue(JSON.stringify(validNftTokenFile));
      mockFs.access.mockResolvedValue(undefined);

      const { api } = createMockApi();

      const logger = makeLogger();
      const args = makeCreateNftFromFileCommandArgs({
        api,
        logger,
        args: { file: fullPath },
      });

      const result = await createNftFromFile(args);

      const output = result.result as CreateNftFromFileOutput;
      expect(output.tokenId).toBe(mockTransactionResults.success.tokenId);
      expect(output.name).toBe(validNftTokenFile.name);
      expect(output.symbol).toBe(validNftTokenFile.symbol);

      expect(mockFs.readFile).toHaveBeenCalledWith(fullPath, 'utf-8');
      expect(mockAddToken).toHaveBeenCalled();
    });

    test('should create NFT from file using absolute path', async () => {
      const mockAddToken = jest.fn();
      MockedHelper.mockImplementation(() => ({
        saveToken: mockAddToken,
      }));

      const absolutePath = '/absolute/path/to/nft.json';
      mockFs.readFile.mockResolvedValue(JSON.stringify(validNftTokenFile));
      mockFs.access.mockResolvedValue(undefined);

      const { api } = createMockApi();

      const logger = makeLogger();
      const args = makeCreateNftFromFileCommandArgs({
        api,
        logger,
        args: { file: absolutePath },
      });

      const result = await createNftFromFile(args);

      const output = result.result as CreateNftFromFileOutput;
      expect(output.tokenId).toBe(mockTransactionResults.success.tokenId);
      expect(output.name).toBe(validNftTokenFile.name);
      expect(output.symbol).toBe(validNftTokenFile.symbol);

      expect(mockFs.readFile).toHaveBeenCalledWith(absolutePath, 'utf-8');
      expect(mockAddToken).toHaveBeenCalled();
    });

    test('should handle finite supply type with maxSupply', async () => {
      const mockAddToken = jest.fn();
      MockedHelper.mockImplementation(() => ({
        saveToken: mockAddToken,
      }));

      mockFs.readFile.mockResolvedValue(JSON.stringify(validNftTokenFile));
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
              if (privateKey === mockKeys.supply) {
                return {
                  keyRefId: 'supply-key-ref-id',
                  publicKey: 'supply-key',
                };
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
      const args = makeCreateNftFromFileCommandArgs({
        api,
        logger,
        args: {
          file: 'test',
        },
      });

      const result = await createNftFromFile(args);

      const output = result.result as CreateNftFromFileOutput;
      expect(output.name).toBe(validNftTokenFile.name);
      expect(output.symbol).toBe(validNftTokenFile.symbol);
      expect(output.treasuryId).toBe(mockAccountIds.treasury);
      expect(output.supplyType).toBe(
        validNftTokenFile.supplyType.toUpperCase(),
      );

      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalledWith(
        expectedNftTransactionParamsFromFile,
      );
    });

    test('should handle infinite supply type', async () => {
      const mockAddToken = jest.fn();
      MockedHelper.mockImplementation(() => ({
        saveToken: mockAddToken,
      }));

      mockFs.readFile.mockResolvedValue(JSON.stringify(infiniteSupplyNftFile));
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
              if (privateKey === mockKeys.supply) {
                return {
                  keyRefId: 'supply-key-ref-id',
                  publicKey: 'supply-key',
                };
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
      const args = makeCreateNftFromFileCommandArgs({
        api,
        logger,
        args: {
          file: 'test',
        },
      });

      const result = await createNftFromFile(args);

      const output = result.result as CreateNftFromFileOutput;
      expect(output.name).toBe(infiniteSupplyNftFile.name);
      expect(output.symbol).toBe(infiniteSupplyNftFile.symbol);
      expect(output.treasuryId).toBe(mockAccountIds.treasury);
      expect(output.supplyType).toBe(
        infiniteSupplyNftFile.supplyType.toUpperCase(),
      );

      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalledWith({
        name: infiniteSupplyNftFile.name,
        symbol: infiniteSupplyNftFile.symbol,
        treasuryId: mockAccountIds.treasury,
        decimals: 0,
        initialSupplyRaw: 0n,
        supplyType: infiniteSupplyNftFile.supplyType.toUpperCase(),
        maxSupplyRaw: 0n,
        adminPublicKey: expect.any(Object),
        supplyPublicKey: expect.any(Object),
        memo: 'Test NFT with infinite supply',
        tokenType: HederaTokenType.NON_FUNGIBLE_TOKEN,
      });
    });

    test('should process associations after NFT creation', async () => {
      const mockAddToken = jest.fn();
      const mockTokenTransaction = mockTransactions.token;
      const _mockAssociationTransaction = mockTransactions.association;
      const mockSignResult = mockTransactionResults.success;

      MockedHelper.mockImplementation(() => ({
        saveToken: mockAddToken,
      }));

      mockFs.readFile.mockResolvedValue(JSON.stringify(validNftTokenFile));
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
              if (privateKey === mockKeys.supply) {
                return {
                  keyRefId: 'supply-key-ref-id',
                  publicKey: 'supply-key',
                };
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
      const args = makeCreateNftFromFileCommandArgs({
        api,
        logger,
        args: {
          file: 'test',
        },
      });

      const result = await createNftFromFile(args);

      const output = result.result as CreateNftFromFileOutput;
      expect(output.tokenId).toBe(mockTransactionResults.success.tokenId);
      expect(output.associations).toBeDefined();
      expect(output.associations.length).toBeGreaterThan(0);

      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        accountId: '0.0.789012',
      });
    });
  });

  describe('file handling scenarios', () => {
    test('should handle file not found', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      mockPath.resolve.mockReturnValue('/resolved/path/to/nft.test.json');

      const { api } = makeApiMocks({});
      const logger = makeLogger();
      const args = makeCreateNftFromFileCommandArgs({
        api,
        logger,
        args: { file: 'nonexistent' },
      });

      await expect(createNftFromFile(args)).rejects.toThrow(FileError);
    });

    test('should handle file read error', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));
      mockPath.resolve.mockReturnValue('/resolved/path/to/nft.test.json');

      const { api } = makeApiMocks({});
      const logger = makeLogger();
      const args = makeCreateNftFromFileCommandArgs({
        api,
        logger,
        args: {
          file: 'test',
        },
      });

      await expect(createNftFromFile(args)).rejects.toThrow(FileError);
    });

    test('should handle invalid JSON', async () => {
      mockFs.readFile.mockResolvedValue('invalid json content');
      mockFs.access.mockResolvedValue(undefined);
      mockPath.resolve.mockReturnValue('/resolved/path/to/nft.test.json');

      const { api } = makeApiMocks({});
      const logger = makeLogger();
      const args = makeCreateNftFromFileCommandArgs({
        api,
        logger,
        args: {
          file: 'test',
        },
      });

      await expect(createNftFromFile(args)).rejects.toThrow(FileError);
    });
  });

  describe('validation scenarios', () => {
    test('should handle missing required fields', async () => {
      mockFs.readFile.mockResolvedValue(
        JSON.stringify(invalidNftFileWithoutName),
      );
      mockFs.access.mockResolvedValue(undefined);
      mockPath.resolve.mockReturnValue('/resolved/path/to/nft.test.json');

      const { api } = makeApiMocks({});
      const logger = makeLogger();
      const args = makeCreateNftFromFileCommandArgs({
        api,
        logger,
        args: {
          file: 'test',
        },
      });

      await expect(createNftFromFile(args)).rejects.toThrow(
        'Invalid NFT token definition file',
      );
    });

    test('should handle missing supplyKey (required for NFT)', async () => {
      mockFs.readFile.mockResolvedValue(
        JSON.stringify(invalidNftFileMissingSupplyKey),
      );
      mockFs.access.mockResolvedValue(undefined);
      mockPath.resolve.mockReturnValue('/resolved/path/to/nft.test.json');

      const { api } = makeApiMocks({});
      const logger = makeLogger();
      const args = makeCreateNftFromFileCommandArgs({
        api,
        logger,
        args: {
          file: 'test',
        },
      });

      await expect(createNftFromFile(args)).rejects.toThrow(
        'Invalid NFT token definition file',
      );
    });

    test('should handle invalid treasury format', async () => {
      mockFs.readFile.mockResolvedValue(
        JSON.stringify(invalidNftFileWithoutTreasury),
      );
      mockFs.access.mockResolvedValue(undefined);
      mockPath.resolve.mockReturnValue('/resolved/path/to/nft.test.json');

      const { api } = makeApiMocks({});
      const logger = makeLogger();
      const args = makeCreateNftFromFileCommandArgs({
        api,
        logger,
        args: {
          file: 'test',
        },
      });

      await expect(createNftFromFile(args)).rejects.toThrow(
        'Invalid NFT token definition file',
      );
    });

    test('should handle invalid supply type', async () => {
      mockFs.readFile.mockResolvedValue(
        JSON.stringify(invalidNftFileWithInvalidSupplyType),
      );
      mockFs.access.mockResolvedValue(undefined);
      mockPath.resolve.mockReturnValue('/resolved/path/to/nft.test.json');

      const { api } = makeApiMocks({});
      const logger = makeLogger();
      const args = makeCreateNftFromFileCommandArgs({
        api,
        logger,
        args: {
          file: 'test',
        },
      });

      await expect(createNftFromFile(args)).rejects.toThrow(
        'Invalid NFT token definition file',
      );
    });

    test('should handle finite supply without maxSupply', async () => {
      mockFs.readFile.mockResolvedValue(
        JSON.stringify(invalidNftFileFiniteWithoutMaxSupply),
      );
      mockFs.access.mockResolvedValue(undefined);
      mockPath.resolve.mockReturnValue('/resolved/path/to/nft.test.json');

      const { api } = makeApiMocks({});
      const logger = makeLogger();
      const args = makeCreateNftFromFileCommandArgs({
        api,
        logger,
        args: {
          file: 'test',
        },
      });

      await expect(createNftFromFile(args)).rejects.toThrow(
        'Invalid NFT token definition file',
      );
    });

    test('should handle infinite supply with maxSupply', async () => {
      mockFs.readFile.mockResolvedValue(
        JSON.stringify(invalidNftFileInfiniteWithMaxSupply),
      );
      mockFs.access.mockResolvedValue(undefined);
      mockPath.resolve.mockReturnValue('/resolved/path/to/nft.test.json');

      const { api } = makeApiMocks({});
      const logger = makeLogger();
      const args = makeCreateNftFromFileCommandArgs({
        api,
        logger,
        args: {
          file: 'test',
        },
      });

      await expect(createNftFromFile(args)).rejects.toThrow(
        'Invalid NFT token definition file',
      );
    });
  });

  describe('error scenarios', () => {
    test('should handle NFT creation failure', async () => {
      const mockAddToken = jest.fn();
      const mockTokenTransaction = mockTransactions.token;
      const mockSignResult = mockTransactionResults.failure;

      MockedHelper.mockImplementation(() => ({
        saveToken: mockAddToken,
      }));

      mockFs.readFile.mockResolvedValue(JSON.stringify(validNftTokenFile));
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
              if (privateKey === mockKeys.supply) {
                return {
                  keyRefId: 'supply-key-ref-id',
                  publicKey: 'supply-key',
                };
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
      const args = makeCreateNftFromFileCommandArgs({
        api,
        logger,
        args: {
          file: 'test',
        },
      });

      await expect(createNftFromFile(args)).rejects.toThrow(StateError);
    });

    test('should handle association failure gracefully', async () => {
      const mockAddToken = jest.fn();
      const mockTokenTransaction = mockTransactions.token;
      const mockSignResult = mockTransactionResults.success;

      MockedHelper.mockImplementation(() => ({
        saveToken: mockAddToken,
      }));

      mockFs.readFile.mockResolvedValue(JSON.stringify(validNftTokenFile));
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
              if (privateKey === mockKeys.supply) {
                return {
                  keyRefId: 'supply-key-ref-id',
                  publicKey: 'supply-key',
                };
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
      const args = makeCreateNftFromFileCommandArgs({
        api,
        logger,
        args: {
          file: 'test',
        },
      });

      const result = await createNftFromFile(args);

      const output = result.result as CreateNftFromFileOutput;
      expect(output.tokenId).toBe(mockTransactionResults.success.tokenId);
      expect(output.name).toBe(validNftTokenFile.name);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Failed to associate account 0.0.789012:'),
      );
    });
  });

  describe('logging and debugging', () => {
    test('should log file processing details', async () => {
      const mockAddToken = jest.fn();
      const mockTokenTransaction = mockTransactions.token;
      const mockSignResult = mockTransactionResults.success;

      MockedHelper.mockImplementation(() => ({
        saveToken: mockAddToken,
      }));

      mockFs.readFile.mockResolvedValue(JSON.stringify(validNftTokenFile));
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
              if (privateKey === mockKeys.supply) {
                return {
                  keyRefId: 'supply-key-ref-id',
                  publicKey: 'supply-key',
                };
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
      const args = makeCreateNftFromFileCommandArgs({
        api,
        logger,
        args: {
          file: 'test',
        },
      });

      const result = await createNftFromFile(args);

      const output = result.result as CreateNftFromFileOutput;
      expect(output.tokenId).toBe(mockTransactionResults.success.tokenId);
      expect(output.name).toBe(validNftTokenFile.name);

      expect(logger.info).toHaveBeenCalledWith(
        'Creating NFT token from file: test',
      );
      expect(logger.info).toHaveBeenCalledWith(
        '🔑 Resolved admin key for signing',
      );
      expect(logger.info).toHaveBeenCalledWith(
        '🔑 Resolved supply key for signing',
      );
    });
  });
});

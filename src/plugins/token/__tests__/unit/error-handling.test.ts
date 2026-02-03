/**
 * Token Plugin Error Handling Tests
 * Tests error scenarios and edge cases across the token plugin
 */
import type { TransactionResult } from '@/core/services/tx-execution/tx-execution-service.interface';

import { validateOutputSchema } from '@/__tests__/shared/output-validation.helper';
import { Status } from '@/core/shared/constants';
import { associateToken } from '@/plugins/token/commands/associate';
import { createToken } from '@/plugins/token/commands/create-ft';
import {
  CreateFungibleTokenOutputSchema,
  type CreateFungibleTokenOutput,
} from '@/plugins/token/commands/create-ft/output';
import { createTokenFromFile } from '@/plugins/token/commands/create-ft-from-file';
import { transferToken } from '@/plugins/token/commands/transfer-ft';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import {
  makeApiMocks,
  makeLogger,
  mockZustandTokenStateHelper,
} from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

/**
 * Helper to create alias mock that resolves test key strings
 */
interface AliasData {
  entityId: string;
  publicKey: string;
  keyRefId: string;
}

const makeTestAliasService = () => ({
  resolve: jest.fn().mockImplementation((alias: string, type: string) => {
    // Mock account alias resolution for test keys
    if (type === 'account') {
      const accountAliases: Record<string, AliasData> = {
        'admin-key': {
          entityId: '0.0.100000',
          publicKey: '302a300506032b6570032100' + '0'.repeat(64),
          keyRefId: 'admin-key-ref-id',
        },
        'treasury-account': {
          entityId: '0.0.123456',
          publicKey: '302a300506032b6570032100' + '1'.repeat(64),
          keyRefId: 'treasury-key-ref-id',
        },
      };
      return accountAliases[alias] || null;
    }
    return null;
  }),
  register: jest.fn(),
  list: jest.fn().mockReturnValue([]),
  remove: jest.fn(),
  availableOrThrow: jest.fn(),
  exists: jest.fn(),
});

describe('Token Plugin Error Handling', () => {
  beforeEach(() => {
    mockZustandTokenStateHelper(MockedHelper);
  });

  describe('network and connectivity errors', () => {
    test('should handle network timeout during token creation', async () => {
      // Arrange
      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest.fn().mockImplementation(() => {
            throw new Error('Network timeout');
          }),
        },
        kms: {
          getPublicKey: jest.fn().mockReturnValue('test-public-key'),
        },
        alias: makeTestAliasService(),
      });

      const logger = makeLogger();
      const args = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          adminKey: 'admin-key',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert
      const result = await createToken(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain(
        'Failed to create fungible token: Network timeout',
      );
      expect(result.outputJson).toBeUndefined();
    });

    test('should handle network connectivity issues during association', async () => {
      // Arrange
      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockImplementation(() => {
              throw new Error('Connection refused');
            }),
        },
      });

      const logger = makeLogger();
      const args = {
        args: {
          token: '0.0.123456',
          account:
            '0.0.789012:2222222222222222222222222222222222222222222222222222222222222222',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert
      const result = await associateToken(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain(
        'Failed to associate token: Connection refused',
      );
      expect(result.outputJson).toBeUndefined();
    });

    test('should handle network errors during transfer', async () => {
      // Arrange
      const { api } = makeApiMocks({
        tokenTransactions: {
          createTransferTransaction: jest.fn().mockImplementation(() => {
            throw new Error('Network unreachable');
          }),
        },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: 6 }),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'imported-key-ref-id',
            publicKey: 'imported-public-key',
          }),
        },
      });

      const logger = makeLogger();
      const args = {
        args: {
          token: '0.0.123456',
          from: '0.0.345678:2222222222222222222222222222222222222222222222222222222222222222',
          to: '0.0.789012',
          amount: '100',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert
      const result = await transferToken(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain(
        'Failed to transfer fungible token: Network unreachable',
      );
      expect(result.outputJson).toBeUndefined();
    });
  });

  describe('authentication and authorization errors', () => {
    test('should handle invalid credentials', async () => {
      // Arrange - Mock KMS to throw error for invalid credentials
      const { api } = makeApiMocks({
        kms: {
          importPrivateKey: jest
            .fn()
            .mockImplementation((_keyType, privateKey) => {
              if (
                privateKey ===
                '9999999999999999999999999999999999999999999999999999999999999999'
              ) {
                throw new Error('Invalid private key format');
              }
              return {
                keyRefId: 'valid-key-ref-id',
                publicKey: 'valid-public-key',
              };
            }),
        },
      });

      const logger = makeLogger();
      const args = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          treasury:
            '0.0.123456:9999999999999999999999999999999999999999999999999999999999999999',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert - Error is thrown before try-catch block in handler
      await expect(createToken(args)).rejects.toThrow(
        'Invalid private key format',
      );
    });

    test('should handle invalid private key', async () => {
      // Arrange
      const mockTokenTransaction = { test: 'transaction' };

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockResolvedValue(mockTokenTransaction),
        },
        signing: {
          signAndExecute: jest.fn().mockResolvedValue({
            success: false,
            transactionId: '',
            receipt: {
              status: {
                status: 'failed',
                transactionId: '',
                error: 'Invalid private key',
              },
            },
          }),
          signAndExecuteWith: jest.fn().mockResolvedValue({
            success: false,
            transactionId: '',
            receipt: {
              status: {
                status: 'failed',
                transactionId: '',
                error: 'Invalid private key',
              },
            },
          }),
        },
        kms: {
          getPublicKey: jest.fn().mockReturnValue('invalid-public-key'),
        },
        alias: makeTestAliasService(),
      });

      const logger = makeLogger();
      const args = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          adminKey: 'admin-key',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert
      const result = await createToken(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.outputJson).toBeUndefined();
      // ADR-003 compliance: logger.error calls are no longer expected
    });

    test('should handle insufficient permissions', async () => {
      // Arrange
      const mockAssociationTransaction = { test: 'association' };
      const _mockSignResult: TransactionResult = {
        success: false,
        transactionId: '',
        consensusTimestamp: '',
        receipt: { status: { status: 'failed', transactionId: '' } },
      };

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockResolvedValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(_mockSignResult),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'imported-key-ref-id',
            publicKey: 'imported-public-key',
          }),
        },
      });

      const logger = makeLogger();
      const args = {
        args: {
          token: '0.0.123456',
          account:
            '0.0.789012:4444444444444444444444444444444444444444444444444444444444444444',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert
      const result = await associateToken(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.outputJson).toBeUndefined();
      // ADR-003 compliance: logger.error calls are no longer expected
      // expect(logger.error).toHaveBeenCalledWith(
      //   '❌ Failed to associate token: Token association failed',
      // );
    });
  });

  describe('business logic errors', () => {
    test('should handle insufficient token balance', async () => {
      // Arrange
      const mockTransferTransaction = { test: 'transfer' };
      const _mockSignResult: TransactionResult = {
        success: false,
        transactionId: '',
        consensusTimestamp: '',
        receipt: { status: { status: 'failed', transactionId: '' } },
      };

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTransferTransaction: jest
            .fn()
            .mockResolvedValue(mockTransferTransaction),
        },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: 6 }),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(_mockSignResult),
        },
      });

      const logger = makeLogger();
      const args = {
        args: {
          token: '0.0.123456',
          from: '0.0.345678:2222222222222222222222222222222222222222222222222222222222222222',
          to: '0.0.789012',
          amount: '1000000',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert
      const result = await transferToken(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.outputJson).toBeUndefined();
    });

    test('should handle token not found', async () => {
      // Arrange
      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockImplementation(() => {
              throw new Error('Token not found');
            }),
        },
      });

      const logger = makeLogger();
      const args = {
        args: {
          token: '0.0.999999',
          account:
            '0.0.789012:1111111111111111111111111111111111111111111111111111111111111111',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert
      const result = await associateToken(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.outputJson).toBeUndefined();
    });

    test('should handle account not found', async () => {
      // Arrange
      const mockAssociationTransaction = { test: 'association' };
      const _mockSignResult: TransactionResult = {
        success: false,
        transactionId: '',
        consensusTimestamp: '',
        receipt: { status: { status: 'failed', transactionId: '' } },
      };

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockResolvedValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(_mockSignResult),
        },
      });

      const logger = makeLogger();
      const args = {
        args: {
          token: '0.0.123456',
          account:
            '0.0.999999:1111111111111111111111111111111111111111111111111111111111111111',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert
      const result = await associateToken(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.outputJson).toBeUndefined();
    });

    test('should handle duplicate token name', async () => {
      // Arrange
      const mockTokenTransaction = { test: 'transaction' };

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockResolvedValue(mockTokenTransaction),
        },
        signing: {
          signAndExecute: jest.fn().mockResolvedValue({
            success: false,
            transactionId: '',
            receipt: { status: { status: 'failed', transactionId: '' } },
          }),
          signAndExecuteWith: jest.fn().mockResolvedValue({
            success: false,
            transactionId: '',
            receipt: { status: { status: 'failed', transactionId: '' } },
          }),
        },
        kms: {
          getPublicKey: jest.fn().mockReturnValue('test-public-key'),
        },
        alias: makeTestAliasService(),
      });

      const logger = makeLogger();
      const args = {
        args: {
          tokenName: 'ExistingToken', // Duplicate name
          symbol: 'TEST',
          adminKey: 'admin-key',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert
      const result = await createToken(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.outputJson).toBeUndefined();
      // ADR-003 compliance: logger.error calls are no longer expected
    });
  });

  describe('file system errors', () => {
    test('should handle file not found error', async () => {
      // Arrange
      const { api } = makeApiMocks();
      const logger = makeLogger();
      const args = {
        args: {
          file: 'nonexistent-file',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert
      const result = await createTokenFromFile(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.outputJson).toBeUndefined();
    });

    test('should handle file permission error', async () => {
      // Arrange
      const { api } = makeApiMocks();
      const logger = makeLogger();
      const args = {
        args: {
          file: 'restricted-file',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert
      const result = await createTokenFromFile(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.outputJson).toBeUndefined();
    });

    test('should handle corrupted JSON file', async () => {
      // Arrange
      const { api } = makeApiMocks();
      const logger = makeLogger();
      const args = {
        args: {
          file: 'corrupted-file',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert
      const result = await createTokenFromFile(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.outputJson).toBeUndefined();
    });
  });

  describe('state management errors', () => {
    test('should handle state service failures', async () => {
      // Arrange
      const mockSaveToken = jest.fn().mockImplementation(() => {
        throw new Error('State service unavailable');
      });

      mockZustandTokenStateHelper(MockedHelper, {
        saveToken: mockSaveToken,
      });

      const mockTokenTransaction = { test: 'transaction' };

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockResolvedValue(mockTokenTransaction),
        },
        signing: {
          signAndExecute: jest.fn().mockResolvedValue({
            success: true,
            transactionId: '0.0.123@1234567890.123456789',
            tokenId: '0.0.123456',
            receipt: {
              status: {
                status: 'success',
                transactionId: '0.0.123@1234567890.123456789',
              },
            },
          }),
          signAndExecuteWith: jest.fn().mockResolvedValue({
            success: true,
            transactionId: '0.0.123@1234567890.123456789',
            tokenId: '0.0.123456',
            receipt: {
              status: {
                status: 'success',
                transactionId: '0.0.123@1234567890.123456789',
              },
            },
          }),
        },
        kms: {
          getPublicKey: jest.fn().mockReturnValue('test-public-key'),
        },
        alias: makeTestAliasService(),
      });

      const logger = makeLogger();
      const args = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          treasuryKey:
            '1111111111111111111111111111111111111111111111111111111111111111',
          adminKey: 'admin-key',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert
      const result = await createToken(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.outputJson).toBeUndefined();
    });
  });

  describe('rate limiting and throttling', () => {
    test('should handle rate limiting errors', async () => {
      // Arrange
      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest.fn().mockImplementation(() => {
            throw new Error('Rate limit exceeded');
          }),
        },
        kms: {
          getPublicKey: jest.fn().mockReturnValue('test-public-key'),
        },
        alias: makeTestAliasService(),
      });

      const logger = makeLogger();
      const args = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          adminKey: 'admin-key',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert
      const result = await createToken(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.outputJson).toBeUndefined();
    });

    test('should handle service throttling', async () => {
      // Arrange
      const mockTransferTransaction = { test: 'transfer' };
      const _mockSignResult: TransactionResult = {
        success: false,
        transactionId: '',
        consensusTimestamp: '',
        receipt: { status: { status: 'failed', transactionId: '' } },
      };

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTransferTransaction: jest
            .fn()
            .mockResolvedValue(mockTransferTransaction),
        },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: 6 }),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(_mockSignResult),
        },
      });

      const logger = makeLogger();
      const args = {
        args: {
          token: '0.0.123456',
          from: '0.0.345678:2222222222222222222222222222222222222222222222222222222222222222',
          to: '0.0.789012',
          amount: '100',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert
      const result = await transferToken(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.outputJson).toBeUndefined();
    });
  });

  describe('malformed data errors', () => {
    test('should handle malformed transaction responses', async () => {
      // Arrange
      const mockTokenTransaction = { test: 'transaction' };
      const _mockSignResult: TransactionResult = {
        success: true,
        transactionId: 'malformed-transaction-id',
        // tokenId is missing - this is the malformed response
        receipt: {
          status: {
            status: 'success',
            transactionId: 'malformed-transaction-id',
          },
        },
      } as TransactionResult;

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockResolvedValue(mockTokenTransaction),
        },
        signing: {
          signAndExecute: jest.fn().mockResolvedValue(_mockSignResult),
          signAndExecuteWith: jest.fn().mockResolvedValue(_mockSignResult),
        },
        kms: {
          getPublicKey: jest.fn().mockReturnValue('test-public-key'),
        },
        alias: makeTestAliasService(),
      });

      const logger = makeLogger();
      const args = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          treasuryKey:
            '1111111111111111111111111111111111111111111111111111111111111111',
          adminKey: 'admin-key',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert
      const result = await createToken(args);

      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.outputJson).toBeUndefined();
    });

    test('should handle unexpected API responses', async () => {
      // Arrange
      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockResolvedValue('unexpected-response-type'),
        },
      });

      const logger = makeLogger();
      const args = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          treasuryKey:
            '1111111111111111111111111111111111111111111111111111111111111111',
          adminKey: 'admin-key',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert
      const result = await createToken(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();
      expect(result.errorMessage).toBeUndefined();
      const createOutput = validateOutputSchema<CreateFungibleTokenOutput>(
        result.outputJson!,
        CreateFungibleTokenOutputSchema,
      );
      expect(createOutput.tokenId).toBeDefined();
    });
  });

  describe('error recovery and resilience', () => {
    test('should handle failures and log appropriate errors', async () => {
      // Arrange
      const mockAssociationTransaction = { test: 'association-transaction' };
      const mockFailureResult: TransactionResult = {
        success: false,
        transactionId: '',
        consensusTimestamp: '',
        receipt: { status: { status: 'failed', transactionId: '' } },
      };

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockResolvedValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockFailureResult),
        },
      });

      const logger = makeLogger();

      // Act - Associate token (should fail)
      const associateArgs = {
        args: {
          token: '0.0.123456',
          account:
            '0.0.345678:2222222222222222222222222222222222222222222222222222222222222222',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert
      const result = await associateToken(associateArgs);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage).toContain('Token association failed');
      expect(result.outputJson).toBeUndefined();
    });
  });
});

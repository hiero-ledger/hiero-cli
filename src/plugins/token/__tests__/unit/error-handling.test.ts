/**
 * Token Plugin Error Handling Tests
 * Tests error scenarios and edge cases across the token plugin
 */
import type { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { createToken } from '../../commands/create';
import { associateToken } from '../../commands/associate';
import { transferToken } from '../../commands/transfer';
import { createTokenFromFile } from '../../commands/createFromFile';
import { ZustandTokenStateHelper } from '../../zustand-state-helper';
import { Status } from '../../../../core/shared/constants';
import type { TransactionResult } from '../../../../core/services/tx-execution/tx-execution-service.interface';
import {
  makeLogger,
  makeApiMocks,
  mockZustandTokenStateHelper,
} from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

/**
 * Helper to create alias mock that resolves test key strings
 */
const makeTestAliasService = () => ({
  resolve: jest.fn().mockImplementation((alias, type) => {
    // Mock key alias resolution for test keys
    if (type === 'key' && alias === 'admin-key') {
      return {
        keyRefId: 'admin-key-ref-id',
        publicKey: 'admin-key',
      };
    }
    return null;
  }),
});

describe('Token Plugin Error Handling', () => {
  beforeEach(() => {
    mockZustandTokenStateHelper(MockedHelper);
  });

  describe('network and connectivity errors', () => {
    test('should handle network timeout during token creation', async () => {
      // Arrange
      const { api, tokenTransactions: _tokenTransactions } = makeApiMocks({
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
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          adminKey: 'admin-key',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act & Assert
      const result = await createToken(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain(
        'Failed to create token: Network timeout',
      );
      expect(result.outputJson).toBeUndefined();
    });

    test('should handle network connectivity issues during association', async () => {
      // Arrange
      const { api, tokenTransactions: _tokenTransactions } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockImplementation(() => {
              throw new Error('Connection refused');
            }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          account: '0.0.789012:test-key',
        },
        api,
        state: {} as any,
        config: {} as any,
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
      const {
        api,
        tokenTransactions: _tokenTransactions,
        kms: _kms,
      } = makeApiMocks({
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
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          from: '0.0.345678:test-key',
          to: '0.0.789012',
          balance: 100,
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act & Assert
      const result = await transferToken(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain(
        'Failed to transfer token: Network unreachable',
      );
      expect(result.outputJson).toBeUndefined();
    });
  });

  describe('authentication and authorization errors', () => {
    test('should handle invalid credentials', async () => {
      // Arrange - Mock KMS to throw error for invalid credentials
      const { api, kms: _kms } = makeApiMocks({
        kms: {
          importPrivateKey: jest
            .fn()
            .mockImplementation((_keyType, privateKey) => {
              if (privateKey === 'invalid-key') {
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
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          treasury: '0.0.123456:invalid-key', // Invalid key format
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act & Assert - Error is thrown before try-catch block
      await expect(createToken(args)).rejects.toThrow(
        'Invalid private key format',
      );
    });

    test('should handle invalid private key', async () => {
      // Arrange
      const mockTokenTransaction = { test: 'transaction' };

      const {
        api,
        tokenTransactions: _tokenTransactions,
        signing: _signing,
        kms: _kms,
      } = makeApiMocks({
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
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          adminKey: 'admin-key',
        },
        api,
        state: {} as any,
        config: {} as any,
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
        receipt: { status: { status: 'failed', transactionId: '' } },
      };

      const {
        api,
        tokenTransactions: _tokenTransactions,
        signing: _signing,
        kms: _kms,
      } = makeApiMocks({
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
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          account: '0.0.789012:insufficient-permissions-key',
        },
        api,
        state: {} as any,
        config: {} as any,
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
        receipt: { status: { status: 'failed', transactionId: '' } },
      };

      const {
        api,
        tokenTransactions: _tokenTransactions,
        signing: _signing,
      } = makeApiMocks({
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
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          from: '0.0.345678:test-key',
          to: '0.0.789012',
          balance: 1000000, // Large amount
        },
        api,
        state: {} as any,
        config: {} as any,
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
      const { api, tokenTransactions: _tokenTransactions } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockImplementation(() => {
              throw new Error('Token not found');
            }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          tokenId: '0.0.999999', // Non-existent token
          accountId: '0.0.789012',
          accountKey: 'test-key',
        },
        api,
        state: {} as any,
        config: {} as any,
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
        receipt: { status: { status: 'failed', transactionId: '' } },
      };

      const {
        api,
        tokenTransactions: _tokenTransactions,
        signing: _signing,
      } = makeApiMocks({
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
      const args: CommandHandlerArgs = {
        args: {
          tokenId: '0.0.123456',
          accountId: '0.0.999999', // Non-existent account
          accountKey: 'test-key',
        },
        api,
        state: {} as any,
        config: {} as any,
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

      const {
        api,
        tokenTransactions: _tokenTransactions,
        signing: _signing,
        kms: _kms,
      } = makeApiMocks({
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
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'ExistingToken', // Duplicate name
          symbol: 'TEST',
          adminKey: 'admin-key',
        },
        api,
        state: {} as any,
        config: {} as any,
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
      const args: CommandHandlerArgs = {
        args: {
          file: 'nonexistent-file',
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
      expect(result.errorMessage).toBeDefined();
      expect(result.outputJson).toBeUndefined();
    });

    test('should handle file permission error', async () => {
      // Arrange
      const { api } = makeApiMocks();
      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: 'restricted-file',
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
      expect(result.errorMessage).toBeDefined();
      expect(result.outputJson).toBeUndefined();
    });

    test('should handle corrupted JSON file', async () => {
      // Arrange
      const { api } = makeApiMocks();
      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          file: 'corrupted-file',
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

      const {
        api,
        tokenTransactions: _tokenTransactions,
        signing: _signing,
        kms: _kms,
      } = makeApiMocks({
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
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          treasuryKey: 'test-key',
          adminKey: 'admin-key',
        },
        api,
        state: {} as any,
        config: {} as any,
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
      const {
        api,
        tokenTransactions: _tokenTransactions,
        kms: _kms,
      } = makeApiMocks({
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
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          adminKey: 'admin-key',
        },
        api,
        state: {} as any,
        config: {} as any,
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
        receipt: { status: { status: 'failed', transactionId: '' } },
      };

      const {
        api,
        tokenTransactions: _tokenTransactions,
        signing: _signing,
      } = makeApiMocks({
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
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          from: '0.0.345678:test-key',
          to: '0.0.789012',
          balance: 100,
        },
        api,
        state: {} as any,
        config: {} as any,
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
      } as any;

      const {
        api,
        tokenTransactions: _tokenTransactions,
        signing: _signing,
        kms: _kms,
      } = makeApiMocks({
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
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          treasuryKey: 'test-key',
          adminKey: 'admin-key',
        },
        api,
        state: {} as any,
        config: {} as any,
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
      const { api, tokenTransactions: _tokenTransactions } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockResolvedValue('unexpected-response-type'),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          treasuryKey: 'test-key',
          adminKey: 'admin-key',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act & Assert
      const result = await createToken(args);

      // ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();
      expect(result.errorMessage).toBeUndefined();
    });
  });

  describe('error recovery and resilience', () => {
    test('should handle failures and log appropriate errors', async () => {
      // Arrange
      const mockAssociationTransaction = { test: 'association-transaction' };
      const mockFailureResult: TransactionResult = {
        success: false,
        transactionId: '',
        receipt: { status: { status: 'failed', transactionId: '' } },
      };

      const {
        api,
        tokenTransactions: _tokenTransactions,
        signing: _signing,
      } = makeApiMocks({
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
      const associateArgs: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          account: '0.0.345678:user-key',
        },
        api,
        state: {} as any,
        config: {} as any,
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

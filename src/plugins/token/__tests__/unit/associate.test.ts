/**
 * Token Associate Handler Unit Tests
 * Tests the token association functionality of the token plugin
 */
import type { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { associateToken } from '../../commands/associate';
import { ZustandTokenStateHelper } from '../../zustand-state-helper';
import type { TransactionResult } from '../../../../core/services/tx-execution/tx-execution-service.interface';
import type { AssociateTokenOutput } from '../../commands/associate';
import { Status } from '../../../../core/shared/constants';
import {
  makeLogger,
  makeApiMocks,
  mockZustandTokenStateHelper,
} from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

describe('associateTokenHandler', () => {
  beforeEach(() => {
    mockZustandTokenStateHelper(MockedHelper);
  });

  describe('success scenarios', () => {
    test('should associate token with account using account-id:account-key format', async () => {
      // Arrange
      const mockAddAssociation = jest.fn();
      const mockAssociationTransaction = { test: 'association-transaction' };
      const mockSignResult: TransactionResult = {
        success: true,
        transactionId: '0.0.123@1234567890.123456789',
        receipt: {} as any,
      };

      mockZustandTokenStateHelper(MockedHelper, {
        addAssociation: mockAddAssociation,
      });

      const { api, tokenTransactions, signing, kms } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
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
          account: '0.0.789012:test-account-key',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await associateToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!) as AssociateTokenOutput;
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.accountId).toBe('0.0.789012');
      expect(output.associated).toBe(true);
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');

      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        accountId: '0.0.789012',
      });
      expect(signing.signAndExecuteWith).toHaveBeenCalledWith(
        mockAssociationTransaction,
        { keyRefId: 'imported-key-ref-id' },
      );
      expect(kms.importPrivateKey).toHaveBeenCalledWith('test-account-key');
    });

    test('should associate token with account using alias', async () => {
      // Arrange
      const mockAddAssociation = jest.fn();
      const mockAssociationTransaction = { test: 'association-transaction' };
      const mockSignResult: TransactionResult = {
        success: true,
        transactionId: '0.0.123@1234567890.123456789',
        receipt: {} as any,
      };

      mockZustandTokenStateHelper(MockedHelper, {
        addAssociation: mockAddAssociation,
      });

      const { api, tokenTransactions, signing, alias } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
        },
        alias: {
          resolve: jest.fn().mockReturnValue({
            entityId: '0.0.789012',
            keyRefId: 'alias-key-ref-id',
          }),
        },
        kms: {
          getPublicKey: jest.fn().mockReturnValue('alias-public-key'),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          account: 'alice',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await associateToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!) as AssociateTokenOutput;
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.accountId).toBe('0.0.789012');
      expect(output.associated).toBe(true);
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');

      expect(alias.resolve).toHaveBeenCalledWith('alice', 'account', 'testnet');
      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        accountId: '0.0.789012',
      });
      expect(signing.signAndExecuteWith).toHaveBeenCalledWith(
        mockAssociationTransaction,
        { keyRefId: 'alias-key-ref-id' },
      );
    });

    test('should update token state with association', async () => {
      // Arrange
      const mockAddAssociation = jest.fn();
      const mockAssociationTransaction = { test: 'association-transaction' };
      const mockSignResult: TransactionResult = {
        success: true,
        transactionId: '0.0.123@1234567890.123456789',
        receipt: {} as any,
      };

      mockZustandTokenStateHelper(MockedHelper, {
        addAssociation: mockAddAssociation,
      });

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
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
          account: '0.0.789012:test-account-key',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await associateToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!) as AssociateTokenOutput;
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.accountId).toBe('0.0.789012');
      expect(output.associated).toBe(true);
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');
    });
  });

  describe('validation scenarios', () => {
    test('should return failure result when account parameter is missing', async () => {
      // Arrange
      const { api } = makeApiMocks();
      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          // account missing
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await associateToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('account: Required');
      expect(result.outputJson).toBeUndefined();
    });

    test('should return failure result when tokenId is missing', async () => {
      // Arrange
      const { api } = makeApiMocks();
      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          // tokenId missing
          account: '0.0.789012:test-account-key',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await associateToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('token: Required');
      expect(result.outputJson).toBeUndefined();
    });

    test('should return failure result when account parameter is empty', async () => {
      // Arrange
      const { api } = makeApiMocks();
      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          account: '',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await associateToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Invalid command parameters');
      expect(result.outputJson).toBeUndefined();
    });
  });

  describe('error scenarios', () => {
    test('should handle transaction failure', async () => {
      // Arrange
      const mockAddAssociation = jest.fn();
      const mockAssociationTransaction = { test: 'association-transaction' };
      const mockSignResult: TransactionResult = {
        success: false,
        transactionId: '',
        receipt: { status: { status: 'failed', transactionId: '' } },
      };

      mockZustandTokenStateHelper(MockedHelper, {
        addAssociation: mockAddAssociation,
      });

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
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
          account: '0.0.789012:test-account-key',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await associateToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBe('Token association failed');
      expect(result.outputJson).toBeUndefined();
    });

    test('should handle token transaction service error', async () => {
      // Arrange
      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockImplementation(() => {
              throw new Error('Service unavailable');
            }),
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
          account: '0.0.789012:test-account-key',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await associateToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to associate token');
      expect(result.outputJson).toBeUndefined();
    });

    test('should handle signing service error', async () => {
      // Arrange
      const mockAssociationTransaction = { test: 'association-transaction' };

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest
            .fn()
            .mockRejectedValue(new Error('Signing failed')),
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
          account: '0.0.789012:test-account-key',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await associateToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to associate token');
      expect(result.outputJson).toBeUndefined();
    });
  });

  describe('state management', () => {
    test('should initialize token state helper and save association', async () => {
      // Arrange
      const mockAddTokenAssociation = jest.fn();
      const mockAssociationTransaction = { test: 'association-transaction' };
      const mockSignResult: TransactionResult = {
        success: true,
        transactionId: '0.0.123@1234567890.123456789',
        receipt: {} as any,
      };

      mockZustandTokenStateHelper(MockedHelper, {
        addTokenAssociation: mockAddTokenAssociation,
      });

      const { api, tokenTransactions, signing, kms } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
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
          account: '0.0.789012:test-account-key',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await associateToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!) as AssociateTokenOutput;
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.accountId).toBe('0.0.789012');
      expect(output.associated).toBe(true);
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');

      // Assert - Verify state helper was initialized
      expect(MockedHelper).toHaveBeenCalledWith(api.state, logger);

      // Assert - Verify association was saved to state
      expect(mockAddTokenAssociation).toHaveBeenCalledWith(
        '0.0.123456',
        '0.0.789012',
        '0.0.789012', // accountName = accountId when using account-id:key format
      );

      // Assert - Verify transaction was created and executed
      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        accountId: '0.0.789012',
      });
      expect(signing.signAndExecuteWith).toHaveBeenCalledWith(
        mockAssociationTransaction,
        { keyRefId: 'imported-key-ref-id' },
      );
      expect(kms.importPrivateKey).toHaveBeenCalledWith('test-account-key');
    });

    test('should use alias name for state when using alias', async () => {
      // Arrange
      const mockAddTokenAssociation = jest.fn();
      const mockAssociationTransaction = { test: 'association-transaction' };
      const mockSignResult: TransactionResult = {
        success: true,
        transactionId: '0.0.123@1234567890.123456789',
        receipt: {} as any,
      };

      mockZustandTokenStateHelper(MockedHelper, {
        addTokenAssociation: mockAddTokenAssociation,
      });

      const { api, tokenTransactions, signing } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
        },
        alias: {
          resolve: jest.fn().mockReturnValue({
            entityId: '0.0.789012',
            keyRefId: 'alias-key-ref-id',
          }),
        },
        kms: {
          getPublicKey: jest.fn().mockReturnValue('alias-public-key'),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          account: 'my-account-alias',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await associateToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!) as AssociateTokenOutput;
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.accountId).toBe('0.0.789012');
      expect(output.associated).toBe(true);
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');

      // Assert - Verify state helper was initialized
      expect(MockedHelper).toHaveBeenCalledWith(api.state, logger);

      // Assert - Verify association was saved with alias name
      expect(mockAddTokenAssociation).toHaveBeenCalledWith(
        '0.0.123456',
        '0.0.789012',
        'my-account-alias', // accountName = alias when using alias format
      );

      // Assert - Verify transaction was created and executed
      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        accountId: '0.0.789012',
      });
      expect(signing.signAndExecuteWith).toHaveBeenCalledWith(
        mockAssociationTransaction,
        { keyRefId: 'alias-key-ref-id' },
      );
    });
  });
});

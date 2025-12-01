/**
 * Token Associate Handler Unit Tests
 * Tests the token association functionality of the token plugin
 */
import type { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { associateToken } from '../../commands/associate';
import { ZustandTokenStateHelper } from '../../zustand-state-helper';
import type { TransactionResult } from '../../../../core/services/tx-execution/tx-execution-service.interface';
import type { AssociateTokenOutput } from '../../commands/associate';
import { Status, KeyAlgorithm } from '../../../../core/shared/constants';
import {
  makeLogger,
  makeApiMocks,
  mockZustandTokenStateHelper,
} from './helpers/mocks';
import {
  tokenAssociatedWithAccountFixture,
  tokenAssociatedWithAliasFixture,
  tokenWithoutAssociationsFixture,
} from './helpers/fixtures';
import { ReceiptStatusError, Status as HederaStatus } from '@hashgraph/sdk';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

describe('associateTokenHandler', () => {
  beforeEach(() => {
    mockZustandTokenStateHelper(MockedHelper);
  });

  describe('success scenarios', () => {
    test('should return success when token is already associated on chain (token exists in local state)', async () => {
      const tokenId = '0.0.123456';
      const accountId = '0.0.789012';
      const mockGetToken = jest
        .fn()
        .mockReturnValue(tokenAssociatedWithAccountFixture);

      mockZustandTokenStateHelper(MockedHelper, {
        getToken: mockGetToken,
      });

      const mockAssociationTransaction = { test: 'association-transaction' };
      const receiptStatusError = new ReceiptStatusError({
        status: HederaStatus.TokenAlreadyAssociatedToAccount,
        transactionId: '0.0.123@1234567890.123456789',
      } as any);

      const { api } = makeApiMocks({
        alias: {
          resolve: jest.fn().mockReturnValue({
            entityId: tokenId,
          }),
        },
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockRejectedValue(receiptStatusError),
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
          token: tokenId,
          account: `${accountId}:3333333333333333333333333333333333333333333333333333333333333333`,
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      const result = await associateToken(args);

      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!) as AssociateTokenOutput;
      expect(output.tokenId).toBe(tokenId);
      expect(output.accountId).toBe(accountId);
      expect(output.associated).toBe(true);
      expect(output.alreadyAssociated).toBe(true);
      expect(output.transactionId).toBeUndefined();
      expect(api.token.createTokenAssociationTransaction).toHaveBeenCalled();
    });

    test('should return success when token is already associated on chain (not in local state)', async () => {
      const tokenId = '0.0.123456';
      const accountId = '0.0.789012';

      const mockGetToken = jest.fn().mockReturnValue(null); // Token not in local state
      const mockAddTokenAssociation = jest.fn();

      mockZustandTokenStateHelper(MockedHelper, {
        getToken: mockGetToken,
        addTokenAssociation: mockAddTokenAssociation,
      });

      const mockAssociationTransaction = { test: 'association-transaction' };
      const receiptStatusError = new ReceiptStatusError({
        status: HederaStatus.TokenAlreadyAssociatedToAccount,
        transactionId: '0.0.123@1234567890.123456789',
      } as any);

      const { api } = makeApiMocks({
        alias: {
          resolve: jest.fn().mockReturnValue({
            entityId: tokenId,
          }),
        },
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockRejectedValue(receiptStatusError),
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
          token: tokenId,
          account: `${accountId}:3333333333333333333333333333333333333333333333333333333333333333`,
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      const result = await associateToken(args);

      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!) as AssociateTokenOutput;
      expect(output.tokenId).toBe(tokenId);
      expect(output.accountId).toBe(accountId);
      expect(output.associated).toBe(true);
      expect(output.alreadyAssociated).toBe(true);
      expect(output.transactionId).toBeUndefined();

      // Verify that addTokenAssociation was NOT called since token doesn't exist in state
      expect(mockAddTokenAssociation).not.toHaveBeenCalled();
    });

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
          account:
            '0.0.789012:3333333333333333333333333333333333333333333333333333333333333333',
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
        ['imported-key-ref-id'],
      );
      expect(kms.importPrivateKey).toHaveBeenCalledWith(
        KeyAlgorithm.ECDSA,
        '3333333333333333333333333333333333333333333333333333333333333333',
        'local',
        ['token:account', 'temporary'],
      );
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
        ['alias-key-ref-id'],
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
          account:
            '0.0.789012:3333333333333333333333333333333333333333333333333333333333333333',
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
          account:
            '0.0.789012:3333333333333333333333333333333333333333333333333333333333333333',
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
          account:
            '0.0.789012:3333333333333333333333333333333333333333333333333333333333333333',
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
          account:
            '0.0.789012:3333333333333333333333333333333333333333333333333333333333333333',
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
      const mockGetToken = jest
        .fn()
        .mockReturnValue(tokenWithoutAssociationsFixture);
      const mockAssociationTransaction = { test: 'association-transaction' };
      const mockSignResult: TransactionResult = {
        success: true,
        transactionId: '0.0.123@1234567890.123456789',
        receipt: {} as any,
      };

      mockZustandTokenStateHelper(MockedHelper, {
        getToken: mockGetToken,
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
          account:
            '0.0.789012:3333333333333333333333333333333333333333333333333333333333333333',
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
        ['imported-key-ref-id'],
      );
      expect(kms.importPrivateKey).toHaveBeenCalledWith(
        KeyAlgorithm.ECDSA,
        '3333333333333333333333333333333333333333333333333333333333333333',
        'local',
        ['token:account', 'temporary'],
      );
    });

    test('should use alias name for state when using alias', async () => {
      // Arrange
      const mockAddTokenAssociation = jest.fn();
      const mockGetToken = jest
        .fn()
        .mockReturnValue(tokenAssociatedWithAliasFixture);
      const mockAssociationTransaction = { test: 'association-transaction' };
      const mockSignResult: TransactionResult = {
        success: true,
        transactionId: '0.0.123@1234567890.123456789',
        receipt: {} as any,
      };

      mockZustandTokenStateHelper(MockedHelper, {
        getToken: mockGetToken,
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
        ['alias-key-ref-id'],
      );
    });
  });
});

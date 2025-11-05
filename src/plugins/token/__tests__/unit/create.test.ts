/**
 * Token Create Handler Unit Tests
 * Tests the token creation functionality of the token plugin
 * Updated for ADR-003 compliance
 */
import type { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { createToken } from '../../commands/create';
import { ZustandTokenStateHelper } from '../../zustand-state-helper';
import type { TransactionResult } from '../../../../core/services/tx-execution/tx-execution-service.interface';
import { Status } from '../../../../core/shared/constants';
import {
  makeLogger,
  makeApiMocks,
  makeTransactionResult,
} from './helpers/mocks';
import {
  mockAccountIds,
  mockTransactions,
  makeTokenCreateCommandArgs,
  expectedTokenTransactionParams,
} from './helpers/fixtures';
// import type { CreateTokenOutput } from '../../commands/create';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

describe('createTokenHandler', () => {
  beforeEach(() => {
    MockedHelper.mockClear();
    MockedHelper.mockImplementation(() => ({
      saveToken: jest.fn().mockResolvedValue(undefined),
    }));
  });

  describe('success scenarios', () => {
    test('should create token with valid parameters', async () => {
      // Arrange
      const mockSaveToken = jest.fn();
      const mockSignResult = makeTransactionResult({
        tokenId: mockAccountIds.treasury,
      });

      MockedHelper.mockImplementation(() => ({
        saveToken: mockSaveToken,
      }));

      const { api, tokenTransactions, signing } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTransactions.token),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
        },
        kms: {
          getPublicKey: jest.fn().mockReturnValue('operator-public-key'),
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'treasury-key-ref-id',
            publicKey: 'treasury-public-key',
          }),
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias, type) => {
            // Mock key alias resolution for test keys
            if (type === 'key' && alias === 'test-admin-key') {
              return {
                keyRefId: 'admin-key-ref-id',
                publicKey: 'test-admin-key',
              };
            }
            return null;
          }),
        },
      });

      const logger = makeLogger();
      const args = makeTokenCreateCommandArgs({ api, logger });

      // Act
      const result = await createToken(args);

      // Assert
      expect(api.kms.importPrivateKey).toHaveBeenCalledWith('test-private-key');
      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalledWith(
        expectedTokenTransactionParams,
      );
      expect(signing.signAndExecuteWith).toHaveBeenCalledWith(
        mockTransactions.token,
        { keyRefId: 'treasury-key-ref-id' },
      );
      expect(mockSaveToken).toHaveBeenCalled();
      expect(result.status).toBe(Status.Success);
      // This test is now ADR-003 compliant
    });

    test('should use default credentials when treasury not provided', async () => {
      // Arrange
      const mockSaveToken = jest.fn();
      const mockSignResult = makeTransactionResult({
        tokenId: mockAccountIds.treasury,
      });

      MockedHelper.mockImplementation(() => ({
        saveToken: mockSaveToken,
      }));

      const { api, tokenTransactions, signing } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTransactions.token),
        },
        signing: {
          signAndExecute: jest.fn().mockResolvedValue(mockSignResult),
        },
        kms: {
          getPublicKey: jest.fn().mockReturnValue('operator-public-key'),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await createToken(args);

      // Assert
      expect(api.network.getOperator).toHaveBeenCalled();
      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalledWith({
        name: 'TestToken',
        symbol: 'TEST',
        decimals: 0,
        initialSupplyRaw: 1000000,
        supplyType: 'INFINITE',
        maxSupplyRaw: undefined,
        treasuryId: '0.0.100000',
        adminKey: 'operator-public-key',
      });
      expect(signing.signAndExecute).toHaveBeenCalledWith(
        mockTransactions.token,
      );
      expect(mockSaveToken).toHaveBeenCalled();
      expect(result.status).toBe(Status.Success);
      // This test is now ADR-003 compliant
    });
  });

  describe('validation scenarios', () => {
    test('should exit with error for invalid parameters', async () => {
      // Arrange
      const { api } = makeApiMocks({});
      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          name: '', // Invalid: empty name
          symbol: 'TEST',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await createToken(args);

      // Assert
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Invalid command parameters');
      // This test is now ADR-003 compliant
    });

    test('should exit with error when no credentials found', async () => {
      // Arrange
      const { api } = makeApiMocks();

      (api.network.getOperator as jest.Mock).mockReturnValue(null);

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await createToken(args);

      // Assert
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to create token');
      expect(result.errorMessage).toContain('No operator credentials found');
      // This test is now ADR-003 compliant
    });
  });

  describe('error scenarios', () => {
    test('should handle transaction failure', async () => {
      // Arrange
      const mockSaveToken = jest.fn();
      const mockTokenTransaction = { test: 'transaction' };
      const mockSignResult = {
        success: true, // Success but no tokenId - this triggers the error
        transactionId: '0.0.123@1234567890.123456789',
        // tokenId is missing - this should trigger the error path
        receipt: {
          status: {
            status: 'success',
            transactionId: '0.0.123@1234567890.123456789',
          },
        },
      };

      MockedHelper.mockImplementation(() => ({
        saveToken: mockSaveToken,
      }));

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTokenTransaction),
        },
        signing: {
          signAndExecute: jest
            .fn()
            .mockResolvedValue(mockSignResult as TransactionResult),
        },
        kms: {
          getPublicKey: jest.fn().mockReturnValue('operator-public-key'),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          adminKey: 'test-admin-key',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await createToken(args);

      // Assert
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to create token');
      expect(result.errorMessage).toContain('no token ID returned');
      expect(mockSaveToken).not.toHaveBeenCalled();
      // This test is now ADR-003 compliant
    });

    test('should handle token transaction service error', async () => {
      // Arrange
      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest.fn().mockImplementation(() => {
            throw new Error('Service error');
          }),
        },
        kms: {
          getPublicKey: jest.fn().mockReturnValue('operator-public-key'),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          adminKey: 'test-admin-key',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await createToken(args);

      // Assert
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toContain('Failed to create token');
      expect(result.errorMessage).toContain('Service error');
      // This test is now ADR-003 compliant
    });
  });

  describe('state management', () => {
    test('should initialize token state helper', async () => {
      // Arrange
      const mockSaveToken = jest.fn();
      const mockTokenTransaction = { test: 'transaction' };
      const mockSignResult: TransactionResult = {
        success: true,
        transactionId: '0.0.123@1234567890.123456789',
        tokenId: '0.0.123456',
        receipt: {
          status: {
            status: 'success',
            transactionId: '0.0.123@1234567890.123456789',
          },
        },
      };

      MockedHelper.mockImplementation(() => ({
        saveToken: mockSaveToken,
      }));

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
          getPublicKey: jest.fn().mockReturnValue('operator-public-key'),
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias, type) => {
            // Mock key alias resolution for test keys
            if (type === 'key' && alias === 'test-admin-key') {
              return {
                keyRefId: 'admin-key-ref-id',
                publicKey: 'test-admin-key',
              };
            }
            return null;
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          adminKey: 'test-admin-key',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      // Act
      const result = await createToken(args);

      // Assert
      expect(MockedHelper).toHaveBeenCalledWith(api.state, logger);
      expect(mockSaveToken).toHaveBeenCalled();
      expect(result.status).toBe(Status.Success);
      // This test is now ADR-003 compliant
    });
  });
});

import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { TransactionResult } from '@/core/types/shared.types';

import { assertOutput } from '@/__tests__/utils/assert-output';
import { InternalError, StateError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { HederaTokenType } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import {
  createFt,
  CreateFungibleTokenOutputSchema,
} from '@/plugins/token/commands/create-ft';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import {
  expectedTokenTransactionParams,
  makeTokenCreateCommandArgs,
  mockAccountIds,
  mockTransactions,
} from './helpers/fixtures';
import {
  makeApiMocks,
  makeLogger,
  makeTransactionResult,
} from './helpers/mocks';

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

      const { api, tokenTransactions, txExecute } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTransactions.token),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(mockSignResult),
        },
        kms: {
          get: jest.fn().mockReturnValue({
            keyRefId: 'mock-key-ref-id',
            publicKey: 'operator-public-key',
          }),
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'treasury-key-ref-id',
            publicKey: 'treasury-public-key',
          }),
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias, type) => {
            // Mock account alias resolution
            if (type === AliasType.Account && alias === 'treasury-account') {
              return {
                entityId: '0.0.123456',
                publicKey: '302a300506032b6570032100' + '1'.repeat(64),
                keyRefId: 'treasury-key-ref-id',
              };
            }
            // Mock account alias resolution for admin-key
            if (type === AliasType.Account && alias === 'test-admin-key') {
              return {
                entityId: '0.0.100000',
                publicKey: '302a300506032b6570032100' + '0'.repeat(64),
                keyRefId: 'admin-key-ref-id',
              };
            }
            return null;
          }),
        },
      });

      const logger = makeLogger();
      const args = makeTokenCreateCommandArgs({ api, logger });

      // Act
      const result = await createFt(args);

      // Assert
      // Note: importPrivateKey is NOT called because treasury is resolved from alias
      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalledWith(
        expectedTokenTransactionParams,
      );
      expect(txExecute.execute).toHaveBeenCalledWith(expect.anything());
      expect(mockSaveToken).toHaveBeenCalled();
      assertOutput(result.result, CreateFungibleTokenOutputSchema);
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

      const { api, tokenTransactions, txExecute } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTransactions.token),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(mockSignResult),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act
      const result = await createFt(args);

      // Assert
      // keyResolver.resolveKeyOrAliasWithFallback is called which internally uses getOperator
      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalledWith({
        name: 'TestToken',
        symbol: 'TEST',
        decimals: 0,
        initialSupplyRaw: 1000000n,
        supplyType: SupplyType.INFINITE,
        maxSupplyRaw: undefined,
        treasuryId: '0.0.100000',
        adminPublicKey: expect.any(Object),
        tokenType: HederaTokenType.FUNGIBLE_COMMON,
        memo: undefined,
      });
      // When adminKey is not provided, only treasury signs (which is the operator)
      expect(txExecute.execute).toHaveBeenCalledWith(expect.anything());
      expect(mockSaveToken).toHaveBeenCalled();
      assertOutput(result.result, CreateFungibleTokenOutputSchema);
    });
  });

  describe('validation scenarios', () => {
    test('should exit with error when no credentials found', async () => {
      // Arrange
      const { api, keyResolver } = makeApiMocks();

      // Mock keyResolver to throw error when no operator is available
      keyResolver.resolveAccountCredentialsWithFallback.mockImplementation(() =>
        Promise.reject(new Error('No operator set')),
      );

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert - Error is thrown before try-catch block in handler
      await expect(createFt(args)).rejects.toThrow('No operator set');
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
        txExecute: {
          execute: jest
            .fn()
            .mockResolvedValue(mockSignResult as TransactionResult),
        },
        kms: {
          get: jest.fn().mockReturnValue({
            keyRefId: 'operator-key-ref-id',
            publicKey: 'operator-public-key',
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
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert
      await expect(createFt(args)).rejects.toThrow(StateError);
      expect(mockSaveToken).not.toHaveBeenCalled();
    });

    test('should handle token transaction service error', async () => {
      // Arrange
      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest.fn().mockImplementation(() => {
            throw new InternalError('Service error');
          }),
        },
        kms: {
          get: jest.fn().mockReturnValue({
            keyRefId: 'operator-key-ref-id',
            publicKey: 'operator-public-key',
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
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert
      await expect(createFt(args)).rejects.toThrow('Service error');
    });
    test('should handle initial supply limit exceeded', async () => {
      const { api } = makeApiMocks({});
      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          adminKey: 'test-admin-key',
          initialSupply: '250000000000000000000000000000',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };
      await expect(createFt(args)).rejects.toThrow(
        'Maximum balance for token exceeded. Token balance cannot be greater than 9223372036854775807',
      );
    });
  });

  describe('state management', () => {
    test('should initialize token state helper', async () => {
      // Arrange
      const mockSaveToken = jest.fn();
      const mockTokenTransaction = { test: 'transaction' };
      const mockSignResult = makeTransactionResult({ tokenId: '0.0.123456' });

      MockedHelper.mockImplementation(() => ({
        saveToken: mockSaveToken,
      }));

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTokenTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(mockSignResult),
        },
        kms: {
          get: jest.fn().mockReturnValue({
            keyRefId: 'operator-key-ref-id',
            publicKey: 'operator-public-key',
          }),
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias, type) => {
            // Mock account alias resolution
            if (type === AliasType.Account && alias === 'treasury-account') {
              return {
                entityId: '0.0.123456',
                publicKey: '302a300506032b6570032100' + '1'.repeat(64),
                keyRefId: 'treasury-key-ref-id',
              };
            }
            // Mock account alias resolution for admin-key
            if (type === AliasType.Account && alias === 'test-admin-key') {
              return {
                entityId: '0.0.100000',
                publicKey: '302a300506032b6570032100' + '0'.repeat(64),
                keyRefId: 'admin-key-ref-id',
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
        state: api.state,
        config: api.config,
        logger,
      };

      // Act
      await createFt(args);

      // Assert
      expect(MockedHelper).toHaveBeenCalledWith(api.state, logger);
      expect(mockSaveToken).toHaveBeenCalled();
    });
  });
});

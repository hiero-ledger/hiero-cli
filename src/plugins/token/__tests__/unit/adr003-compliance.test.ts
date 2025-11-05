/**
 * ADR-003 Compliance Tests for Token Plugin
 * Tests that all command handlers return CommandExecutionResult according to ADR-003
 */
import type { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { createToken } from '../../commands/create/handler';
import { transferToken } from '../../commands/transfer/handler';
import { associateToken } from '../../commands/associate/handler';
import { listTokens } from '../../commands/list/handler';
import { createTokenFromFile } from '../../commands/createFromFile/handler';
import { ZustandTokenStateHelper } from '../../zustand-state-helper';
import type { CreateTokenOutput } from '../../commands/create';
import type { TransferTokenOutput } from '../../commands/transfer';
import type { AssociateTokenOutput } from '../../commands/associate';
import type { ListTokensOutput } from '../../commands/list';
import {
  makeLogger,
  makeApiMocks,
  makeTransactionResult,
} from './helpers/mocks';
import { Status } from '../../../../core/shared/constants';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

describe('ADR-003 Compliance - Token Plugin', () => {
  beforeEach(() => {
    MockedHelper.mockClear();
    MockedHelper.mockImplementation(() => ({
      saveToken: jest.fn(),
      addTokenAssociation: jest.fn(),
      listTokens: jest.fn().mockReturnValue([]),
      getTokensWithStats: jest.fn().mockReturnValue({
        total: 0,
        byNetwork: {},
        bySupplyType: {},
        withAssociations: 0,
        totalAssociations: 0,
      }),
    }));
  });

  describe('createTokenHandler', () => {
    test('returns CommandExecutionResult on success', async () => {
      // Arrange
      const mockSignResult = makeTransactionResult({
        tokenId: '0.0.12345',
        transactionId: '0.0.123@1700000000.123456789',
        success: true,
      });

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest.fn().mockReturnValue({}),
        },
        signing: {
          signAndExecute: jest.fn().mockResolvedValue(mockSignResult),
        },
        kms: {
          getPublicKey: jest.fn().mockReturnValue('test-public-key'),
        },
        alias: {
          register: jest.fn(),
        },
      });

      const args = {
        tokenName: 'TestToken',
        symbol: 'TTK',
        decimals: 2,
        initialSupply: '1000',
        supplyType: 'INFINITE',
      };

      // Act
      const result = await createToken({
        api,
        logger: makeLogger(),
        state: {} as any,
        config: {} as any,
        args,
      } as CommandHandlerArgs);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!) as CreateTokenOutput;
      expect(output.tokenId).toBe('0.0.12345');
      expect(output.name).toBe('TestToken');
      expect(output.symbol).toBe('TTK');
      expect(output.transactionId).toBe('0.0.123@1700000000.123456789');
    });

    test('returns failure result on error', async () => {
      // Arrange - invalid args to trigger validation error
      const { api } = makeApiMocks();

      const args = {
        // Missing required fields
      };

      // Act
      const result = await createToken({
        api,
        logger: makeLogger(),
        state: {} as any,
        config: {} as any,
        args,
      } as CommandHandlerArgs);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage).toContain('Invalid command parameters');
    });
  });

  describe('transferTokenHandler', () => {
    test('returns CommandExecutionResult on success', async () => {
      // Arrange
      const mockSignResult = makeTransactionResult({
        transactionId: '0.0.123@1700000000.123456789',
        success: true,
      });

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTransferTransaction: jest.fn().mockReturnValue({}),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
        },
        alias: {
          resolve: jest
            .fn()
            .mockImplementation(
              (alias: string, type: string, _network: string) => {
                if (
                  type === 'account' &&
                  (alias === '0.0.111' || alias === '0.0.222')
                ) {
                  return {
                    entityId: alias,
                    keyRefId: `key-ref-${alias}`,
                    alias: alias,
                  };
                }
                if (type === 'token' && alias === '0.0.12345') {
                  return {
                    entityId: alias,
                  };
                }
                return null;
              },
            ),
        },
        kms: {
          getPublicKey: jest.fn().mockReturnValue('mock-public-key'),
        },
      });

      const args = {
        token: '0.0.12345',
        from: '0.0.111',
        to: '0.0.222',
        balance: '100t',
      };

      // Act
      const result = await transferToken({
        api,
        logger: makeLogger(),
        state: {} as any,
        config: {} as any,
        args,
      } as CommandHandlerArgs);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!) as TransferTokenOutput;
      expect(output.tokenId).toBe('0.0.12345');
      expect(output.transactionId).toBe('0.0.123@1700000000.123456789');
      expect(output.amount).toBe('100');
    });

    test('returns failure result on invalid parameters', async () => {
      // Arrange
      const { api } = makeApiMocks();

      const args = {
        // Missing required token parameter
        to: '0.0.222',
        balance: 100,
      };

      // Act
      const result = await transferToken({
        api,
        logger: makeLogger(),
        state: {} as any,
        config: {} as any,
        args,
      } as CommandHandlerArgs);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
    });
  });

  describe('associateTokenHandler', () => {
    test('returns CommandExecutionResult on success', async () => {
      // Arrange
      const mockSignResult = makeTransactionResult({
        transactionId: '0.0.123@1700000000.123456789',
        success: true,
      });

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest.fn().mockReturnValue({}),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
        },
        alias: {
          resolve: jest.fn().mockReturnValue({
            entityId: '0.0.12345',
          }),
        },
      });

      const args = {
        token: '0.0.12345',
        account: '0.0.111:account-key',
      };

      // Act
      const result = await associateToken({
        api,
        logger: makeLogger(),
        state: {} as any,
        config: {} as any,
        args,
      } as CommandHandlerArgs);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!) as AssociateTokenOutput;
      expect(output.tokenId).toBe('0.0.12345');
      expect(output.associated).toBe(true);
      expect(output.transactionId).toBe('0.0.123@1700000000.123456789');
    });
  });

  describe('listTokensHandler', () => {
    test('returns CommandExecutionResult with empty list', async () => {
      // Arrange
      const { api } = makeApiMocks();

      const args = {};

      // Act
      const result = await listTokens({
        api,
        logger: makeLogger(),
        state: {} as any,
        config: {} as any,
        args,
      } as CommandHandlerArgs);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!) as ListTokensOutput;
      expect(output.tokens).toEqual([]);
      expect(output.count).toBe(0);
      expect(output.stats).toBeDefined();
    });

    test('returns CommandExecutionResult with token list', async () => {
      // Arrange
      MockedHelper.mockImplementation(() => ({
        listTokens: jest.fn().mockReturnValue([
          {
            tokenId: '0.0.12345',
            name: 'TestToken',
            symbol: 'TTK',
            decimals: 2,
            supplyType: 'INFINITE',
            treasuryId: '0.0.111',
            network: 'testnet',
          },
        ]),
        getTokensWithStats: jest.fn().mockReturnValue({
          total: 1,
          byNetwork: { testnet: 1 },
          bySupplyType: { INFINITE: 1 },
          withAssociations: 0,
          totalAssociations: 0,
        }),
      }));

      const { api } = makeApiMocks();

      const args = {};

      // Act
      const result = await listTokens({
        api,
        logger: makeLogger(),
        state: {} as any,
        config: {} as any,
        args,
      } as CommandHandlerArgs);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(result.outputJson!) as ListTokensOutput;
      expect(output.tokens).toHaveLength(1);
      expect(output.tokens[0].tokenId).toBe('0.0.12345');
      expect(output.count).toBe(1);
    });
  });

  describe('All handlers follow ADR-003 contract', () => {
    test('all handlers return CommandExecutionResult interface', async () => {
      // This test verifies that all handlers return the correct interface type
      const handlers = [
        createToken,
        transferToken,
        associateToken,
        listTokens,
        createTokenFromFile,
      ];

      const { api } = makeApiMocks();

      for (const handler of handlers) {
        // Arrange - use minimal args that might cause validation errors
        const args = {};

        try {
          // Act
          const result = await handler({
            api,
            logger: makeLogger(),
            state: {} as any,
            config: {} as any,
            args,
          } as CommandHandlerArgs);

          // Assert - should always return CommandExecutionResult
          expect(result).toBeDefined();
          expect(result).toHaveProperty('status');
          expect([Status.Success, Status.Failure]).toContain(result.status);

          if (result.status === Status.Success) {
            expect(result).toHaveProperty('outputJson');
          }

          if (result.status !== Status.Success) {
            expect(result).toHaveProperty('errorMessage');
          }
        } catch (error) {
          // Handlers should not throw - they should return failure results
          fail(
            `Handler ${handler.name} threw an error instead of returning a failure result: ${String(error)}`,
          );
        }
      }
    });
  });
});

/**
 * ADR-003 Compliance Tests for Token Plugin
 * Tests that all command handlers return CommandExecutionResult according to ADR-003
 */
import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import { Status } from '@/core/shared/constants';
import type { AssociateTokenOutput } from '@/plugins/token/commands/associate';
import { associateToken } from '@/plugins/token/commands/associate/handler';
import type { CreateTokenOutput } from '@/plugins/token/commands/create';
import { createToken } from '@/plugins/token/commands/create/handler';
import type { ListTokensOutput } from '@/plugins/token/commands/list';
import { listTokens } from '@/plugins/token/commands/list/handler';
import type { TransferTokenOutput } from '@/plugins/token/commands/transfer';
import { transferToken } from '@/plugins/token/commands/transfer/handler';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import {
  makeApiMocks,
  makeLogger,
  makeTransactionResult,
} from './helpers/mocks';

import '@/core/utils/json-serialize';

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
      getToken: jest.fn().mockReturnValue(null),
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
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
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
            .mockImplementation((alias: string, type: string) => {
              if (
                type === 'account' &&
                (alias === '0.0.111' || alias === '0.0.222')
              ) {
                return {
                  entityId: alias,
                  keyRefId: `key-ref-${alias}`,
                  alias,
                };
              }
              if (type === 'token' && alias === '0.0.12345') {
                return {
                  entityId: alias,
                };
              }
              return null;
            }),
        },
        kms: {
          getPublicKey: jest.fn().mockReturnValue('mock-public-key'),
        },
      });

      const args = {
        token: '0.0.12345',
        to: '0.0.222',
        amount: '100t',
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
        account:
          '0.0.111:4444444444444444444444444444444444444444444444444444444444444444',
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
});

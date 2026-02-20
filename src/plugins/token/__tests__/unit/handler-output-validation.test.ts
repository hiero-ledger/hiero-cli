import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { AssociateTokenOutput } from '@/plugins/token/commands/associate';
import type { CreateFungibleTokenOutput } from '@/plugins/token/commands/create-ft';
import type { ListTokensOutput } from '@/plugins/token/commands/list';
import type { TransferFungibleTokenOutput } from '@/plugins/token/commands/transfer-ft';

import '@/core/utils/json-serialize';

import { SupplyType } from '@/core/types/shared.types';
import { associateToken } from '@/plugins/token/commands/associate/handler';
import { createToken } from '@/plugins/token/commands/create-ft/handler';
import { listTokens } from '@/plugins/token/commands/list/handler';
import { transferToken } from '@/plugins/token/commands/transfer-ft/handler';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import {
  makeApiMocks,
  makeLogger,
  makeTransactionResult,
} from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

describe('Handler Output Validation - Token Plugin', () => {
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
    test('returns CommandResult on success', async () => {
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
        supplyType: SupplyType.INFINITE,
      };

      const result = await createToken({
        api,
        logger: makeLogger(),
        state: api.state,
        config: api.config,
        args,
      } as CommandHandlerArgs);

      const output = result.result as CreateFungibleTokenOutput;
      expect(output.tokenId).toBe('0.0.12345');
      expect(output.name).toBe('TestToken');
      expect(output.symbol).toBe('TTK');
      expect(output.transactionId).toBe('0.0.123@1700000000.123456789');
    });
  });

  describe('transferTokenHandler', () => {
    test('returns CommandResult on success', async () => {
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

      const result = await transferToken({
        api,
        logger: makeLogger(),
        state: api.state,
        config: api.config,
        args,
      } as CommandHandlerArgs);

      const output = result.result as TransferFungibleTokenOutput;
      expect(output.tokenId).toBe('0.0.12345');
      expect(output.transactionId).toBe('0.0.123@1700000000.123456789');
      expect(output.amount).toBe(100n);
    });
  });

  describe('associateTokenHandler', () => {
    test('returns CommandResult on success', async () => {
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
        mirror: {
          getAccountTokenBalances: jest.fn().mockResolvedValue({ tokens: [] }),
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

      const result = await associateToken({
        api,
        logger: makeLogger(),
        state: api.state,
        config: api.config,
        args,
      } as CommandHandlerArgs);

      const output = result.result as AssociateTokenOutput;
      expect(output.tokenId).toBe('0.0.12345');
      expect(output.associated).toBe(true);
      expect(output.transactionId).toBe('0.0.123@1700000000.123456789');
    });
  });

  describe('listTokensHandler', () => {
    test('returns CommandResult with empty list', async () => {
      const { api } = makeApiMocks();

      const args = {};

      const result = await listTokens({
        api,
        logger: makeLogger(),
        state: api.state,
        config: api.config,
        args,
      } as CommandHandlerArgs);

      const output = result.result as ListTokensOutput;
      expect(output.tokens).toEqual([]);
      expect(output.totalCount).toBe(0);
      expect(output.stats).toBeDefined();
    });

    test('returns CommandResult with token list', async () => {
      MockedHelper.mockImplementation(() => ({
        listTokens: jest.fn().mockReturnValue([
          {
            tokenId: '0.0.12345',
            name: 'TestToken',
            symbol: 'TTK',
            decimals: 2,
            supplyType: SupplyType.INFINITE,
            treasuryId: '0.0.111',
            network: 'testnet',
          },
        ]),
        getTokensWithStats: jest.fn().mockReturnValue({
          total: 1,
          byNetwork: { testnet: 1 },
          bySupplyType: { [SupplyType.INFINITE]: 1 },
          withAssociations: 0,
          totalAssociations: 0,
        }),
      }));

      const { api } = makeApiMocks();

      const args = {};

      const result = await listTokens({
        api,
        logger: makeLogger(),
        state: api.state,
        config: api.config,
        args,
      } as CommandHandlerArgs);

      const output = result.result as ListTokensOutput;
      expect(output.tokens).toHaveLength(1);
      expect(output.tokens[0].tokenId).toBe('0.0.12345');
      expect(output.totalCount).toBe(1);
    });
  });
});

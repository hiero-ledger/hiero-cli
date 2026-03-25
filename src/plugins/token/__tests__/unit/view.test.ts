import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import '@/core/utils/json-serialize';

import { assertOutput } from '@/__tests__/utils/assert-output';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import {
  tokenView,
  TokenViewOutputSchema,
} from '@/plugins/token/commands/view';
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

describe('tokenViewHandler', () => {
  beforeEach(() => {
    mockZustandTokenStateHelper(MockedHelper);
  });

  describe('success scenarios', () => {
    test('should view token with valid token ID', async () => {
      const mockTokenInfo = {
        token_id: '0.0.123456',
        name: 'TestToken',
        symbol: 'TEST',
        decimals: '2',
        total_supply: '1000000',
        max_supply: '0',
        type: 'FUNGIBLE_COMMON',
        supply_type: 'INFINITE',
        treasury_account_id: '0.0.789012',
        freeze_default: true,
        auto_renew_period: 2592000,
        auto_renew_account: '0.0.789012',
        expiry_timestamp: 1893456000000000000,
        admin_key: null,
        supply_key: null,
        memo: 'Test memo',
        created_timestamp: '1700000000.000000000',
      };

      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue(mockTokenInfo),
        },
        alias: {
          resolve: jest.fn().mockReturnValue(null),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenView(args);

      const output = assertOutput(result.result, TokenViewOutputSchema);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.name).toBe('TestToken');
      expect(output.symbol).toBe('TEST');
      expect(output.type).toBe('FUNGIBLE_COMMON');
      expect(output.freezeDefault).toBe(true);
      expect(output.treasury).toBe('0.0.789012');
      expect(output.autoRenewPeriodSeconds).toBe(2592000);
      expect(output.autoRenewAccountId).toBe('0.0.789012');
      expect(output.expirationTime).toBe('2030-01-01T00:00:00.000Z');
    });

    test('should view token using alias', async () => {
      const mockTokenInfo = {
        token_id: '0.0.123456',
        name: 'TestToken',
        symbol: 'TEST',
        decimals: '2',
        total_supply: '1000000',
        max_supply: '0',
        type: 'FUNGIBLE_COMMON',
        supply_type: 'INFINITE',
        treasury_account_id: '0.0.789012',
        admin_key: null,
        supply_key: null,
        memo: 'Test memo',
        freeze_default: false,
        created_timestamp: '1700000000.000000000',
      };

      const { api, alias } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue(mockTokenInfo),
        },
        alias: {
          resolve: jest.fn().mockReturnValue({
            entityId: '0.0.123456',
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: 'my-token',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenView(args);

      const output = assertOutput(result.result, TokenViewOutputSchema);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.name).toBe('TestToken');
      expect(output.symbol).toBe('TEST');

      expect(alias.resolve).toHaveBeenCalledWith(
        'my-token',
        AliasType.Token,
        'testnet',
      );
    });
  });

  describe('error scenarios', () => {
    test('should handle token not found on mirror node', async () => {
      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockRejectedValue(new Error('Not found')),
        },
        alias: {
          resolve: jest.fn().mockReturnValue(null),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.999999',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenView(args)).rejects.toThrow();
    });

    test('should handle mirror node API error', async () => {
      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockRejectedValue(new Error('API Error')),
        },
        alias: {
          resolve: jest.fn().mockReturnValue(null),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenView(args)).rejects.toThrow('API Error');
    });
  });
});

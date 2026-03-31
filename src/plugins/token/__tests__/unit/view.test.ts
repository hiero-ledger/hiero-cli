import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import '@/core/utils/json-serialize';

import { MOCK_ACCOUNT_ID } from '@/__tests__/mocks/fixtures';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { DAY_IN_SECONDS } from '@/core/shared/constants';
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
        treasury_account_id: MOCK_ACCOUNT_ID,
        freeze_default: true,
        auto_renew_period: 30 * DAY_IN_SECONDS,
        auto_renew_account: MOCK_ACCOUNT_ID,
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
      expect(output.treasury).toBe(MOCK_ACCOUNT_ID);
      expect(output.autoRenewPeriodSeconds).toBe(30 * DAY_IN_SECONDS);
      expect(output.autoRenewAccountId).toBe(MOCK_ACCOUNT_ID);
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
        treasury_account_id: MOCK_ACCOUNT_ID,
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

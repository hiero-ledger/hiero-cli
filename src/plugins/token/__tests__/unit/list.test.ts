import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import '@/core/utils/json-serialize';

import { SupplyType } from '@/core/types/shared.types';
import {
  listTokens,
  type ListTokensOutput,
} from '@/plugins/token/commands/list';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import {
  makeApiMocks,
  makeLogger,
  setupZustandHelperMock,
} from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

describe('listTokensHandler', () => {
  beforeEach(() => {
    setupZustandHelperMock(MockedHelper, { tokens: [] });
  });

  describe('success scenarios', () => {
    test('should return empty list when no tokens exist', async () => {
      const { api } = makeApiMocks();

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {},
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await listTokens(args);

      const output = result.result as ListTokensOutput;
      expect(output.tokens).toEqual([]);
      expect(output.totalCount).toBe(0);
      expect(output.stats).toBeDefined();
    });

    test('should return list of tokens', async () => {
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

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {},
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await listTokens(args);

      const output = result.result as ListTokensOutput;
      expect(output.tokens).toHaveLength(1);
      expect(output.tokens[0].tokenId).toBe('0.0.12345');
      expect(output.totalCount).toBe(1);
    });

    test('should return list filtered by network', async () => {
      MockedHelper.mockImplementation(() => ({
        listTokens: jest.fn().mockReturnValue([
          {
            tokenId: '0.0.99999',
            name: 'MainnetToken',
            symbol: 'MNT',
            decimals: 8,
            supplyType: SupplyType.FINITE,
            treasuryId: '0.0.222',
            network: 'mainnet',
          },
        ]),
        getTokensWithStats: jest.fn().mockReturnValue({
          total: 1,
          byNetwork: { mainnet: 1 },
          bySupplyType: { [SupplyType.FINITE]: 1 },
          withAssociations: 0,
          totalAssociations: 0,
        }),
      }));

      const { api } = makeApiMocks();

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: { network: 'mainnet' },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await listTokens(args);

      const output = result.result as ListTokensOutput;
      expect(output.tokens).toHaveLength(1);
      expect(output.tokens[0].tokenId).toBe('0.0.99999');
      expect(output.tokens[0].network).toBe('mainnet');
    });
  });

  describe('state management', () => {
    test('should initialize token state helper', async () => {
      const { api } = makeApiMocks();

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {},
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await listTokens(args);

      expect(MockedHelper).toHaveBeenCalledWith(api.state, logger);
    });
  });
});

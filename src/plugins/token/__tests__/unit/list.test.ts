import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import '@/core/utils/json-serialize';

import { assertOutput } from '@/__tests__/utils/assert-output';
import { HederaTokenType } from '@/core/shared/constants';
import { SupplyType, SupportedNetwork } from '@/core/types/shared.types';
import {
  tokenList,
  TokenListOutputSchema,
} from '@/plugins/token/commands/list';
import { TokenStateServiceImpl } from '@/plugins/token/services/token-state.service';

import { makeApiMocks, setupTokenStateServiceMock } from './helpers/mocks';

jest.mock('../../services/token-state.service', () => ({
  TokenStateServiceImpl: jest.fn(),
}));

const MockedHelper = TokenStateServiceImpl as jest.Mock;

describe('tokenListHandler', () => {
  beforeEach(() => {
    setupTokenStateServiceMock(MockedHelper, { tokens: [] });
  });

  describe('success scenarios', () => {
    test('should return empty list when no tokens exist', async () => {
      const { api } = makeApiMocks();

      const args: CommandHandlerArgs = {
        args: {},
        api,
      };

      const result = await tokenList(args);

      const output = assertOutput(result.result, TokenListOutputSchema);
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
            tokenType: HederaTokenType.FUNGIBLE_COMMON,
            maxSupply: 0,

            treasuryId: '0.0.111',
            network: SupportedNetwork.TESTNET,
          },
        ]),
        getTokensWithStats: jest.fn().mockReturnValue({
          total: 1,
          withKeys: 0,
          byNetwork: { testnet: 1 },
          bySupplyType: { [SupplyType.INFINITE]: 1 },
        }),
      }));

      const { api } = makeApiMocks();

      const args: CommandHandlerArgs = {
        args: {},
        api,
      };

      const result = await tokenList(args);

      const output = assertOutput(result.result, TokenListOutputSchema);
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
            tokenType: HederaTokenType.FUNGIBLE_COMMON,
            maxSupply: 0,

            treasuryId: '0.0.222',
            network: SupportedNetwork.MAINNET,
          },
        ]),
        getTokensWithStats: jest.fn().mockReturnValue({
          total: 1,
          withKeys: 0,
          byNetwork: { mainnet: 1 },
          bySupplyType: { [SupplyType.FINITE]: 1 },
        }),
      }));

      const { api } = makeApiMocks();

      const args: CommandHandlerArgs = {
        args: { network: SupportedNetwork.MAINNET },
        api,
      };

      const result = await tokenList(args);

      const output = assertOutput(result.result, TokenListOutputSchema);
      expect(output.tokens).toHaveLength(1);
      expect(output.tokens[0].tokenId).toBe('0.0.99999');
      expect(output.tokens[0].network).toBe(SupportedNetwork.MAINNET);
    });
  });

  describe('state management', () => {
    test('should initialize token state helper', async () => {
      const { api } = makeApiMocks();

      const args: CommandHandlerArgs = {
        args: {},
        api,
      };

      await tokenList(args);

      expect(MockedHelper).toHaveBeenCalled();
    });
  });
});

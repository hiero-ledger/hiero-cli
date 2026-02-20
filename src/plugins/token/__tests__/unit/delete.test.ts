import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import '@/core/utils/json-serialize';

import { NotFoundError } from '@/core/errors';
import {
  deleteToken,
  type DeleteTokenOutput,
} from '@/plugins/token/commands/delete';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import {
  makeDeleteApiMocks,
  makeLogger,
  mockZustandTokenStateHelper,
} from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

describe('deleteTokenHandler', () => {
  beforeEach(() => {
    mockZustandTokenStateHelper(MockedHelper);
  });

  describe('success scenarios', () => {
    test('deletes token from state and removes matching aliases', async () => {
      const mockGetToken = jest.fn().mockReturnValue({
        tokenId: '0.0.123456',
        name: 'TestToken',
      });
      const mockRemoveToken = jest.fn();

      mockZustandTokenStateHelper(MockedHelper, {
        getToken: mockGetToken,
        removeToken: mockRemoveToken,
      });

      const { api } = makeDeleteApiMocks({
        entityId: '0.0.123456',
        alias: {
          list: jest.fn().mockReturnValue([
            {
              alias: 'my-token',
              entityId: '0.0.123456',
              type: 'token',
              network: 'testnet',
              createdAt: '2024-01-01T00:00:00.000Z',
            },
          ]),
          remove: jest.fn(),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: { token: '0.0.123456' },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await deleteToken(args);

      const output = result.result as DeleteTokenOutput;
      expect(output.deletedToken.tokenId).toBe('0.0.123456');
      expect(output.deletedToken.name).toBe('TestToken');
      expect(output.network).toBe('testnet');
      expect(output.removedAliases).toEqual(['my-token (testnet)']);

      expect(api.alias.remove).toHaveBeenCalledWith('my-token', 'testnet');
      expect(mockRemoveToken).toHaveBeenCalledWith('0.0.123456');
    });

    test('deletes token without removedAliases when no alias points to token', async () => {
      mockZustandTokenStateHelper(MockedHelper, {
        getToken: jest.fn().mockReturnValue({
          tokenId: '0.0.123456',
          name: 'TestToken',
        }),
      });

      const { api } = makeDeleteApiMocks({
        entityId: '0.0.123456',
        alias: {
          list: jest.fn().mockReturnValue([]),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: { token: 'my-token' },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await deleteToken(args);

      const output = result.result as DeleteTokenOutput;
      expect(output.deletedToken.tokenId).toBe('0.0.123456');
      expect(output.deletedToken.name).toBe('TestToken');
      expect(output.removedAliases).toBeUndefined();
    });
  });

  describe('error scenarios', () => {
    test('throws NotFoundError when token does not exist in state', async () => {
      mockZustandTokenStateHelper(MockedHelper, {
        getToken: jest.fn().mockReturnValue(null),
      });

      const { api } = makeDeleteApiMocks({
        entityId: '0.0.999999',
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: { token: 'nonexistent-token' },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(deleteToken(args)).rejects.toThrow(NotFoundError);
    });

    test('bubbles identity resolution errors', async () => {
      const { api } = makeDeleteApiMocks({
        resolveReferenceToEntityOrEvmAddressError: new Error(
          'identity resolution failed',
        ),
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: { token: 'bad-ref' },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(deleteToken(args)).rejects.toThrow(
        'identity resolution failed',
      );
    });
  });
});

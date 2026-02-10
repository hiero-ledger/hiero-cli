import { makeArgs } from '@/__tests__/mocks/mocks';
import { Status } from '@/core/shared/constants';
import {
  deleteToken,
  type DeleteTokenOutput,
} from '@/plugins/token/commands/delete';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { mockDeleteAliasRecords, mockDeleteTokens } from './helpers/fixtures';
import {
  makeApiMocks,
  makeLogger,
  setupDeleteZustandHelperMock,
} from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

describe('token plugin - delete command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deletes token successfully by id', async () => {
    const logger = makeLogger();
    const removeTokenMock = jest.fn();

    setupDeleteZustandHelperMock(MockedHelper, {
      getToken: jest.fn().mockReturnValue(mockDeleteTokens.basic),
      removeToken: removeTokenMock,
    });

    const { api } = makeApiMocks({
      network: 'testnet',
      alias: { list: jest.fn().mockReturnValue([]) },
    });
    const args = makeArgs(api, logger, { id: '0.0.1111' });

    const result = await deleteToken(args);

    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    expect(result.errorMessage).toBeUndefined();

    expect(removeTokenMock).toHaveBeenCalledWith('0.0.1111');

    const output: DeleteTokenOutput = JSON.parse(result.outputJson!);
    expect(output.deletedToken.name).toBe('TestToken');
    expect(output.deletedToken.tokenId).toBe('0.0.1111');
    expect(output.network).toBe('testnet');
  });

  test('deletes token successfully by name (alias)', async () => {
    const logger = makeLogger();
    const removeTokenMock = jest.fn();

    setupDeleteZustandHelperMock(MockedHelper, {
      getToken: jest.fn().mockReturnValue(mockDeleteTokens.aliased),
      removeToken: removeTokenMock,
    });

    const { api } = makeApiMocks({
      network: 'testnet',
      alias: {
        resolve: jest.fn().mockReturnValue({
          alias: 'my-token',
          entityId: '0.0.2222',
          type: 'token',
          network: 'testnet',
        }),
        list: jest.fn().mockReturnValue([]),
      },
    });
    const args = makeArgs(api, logger, { name: 'my-token' });

    const result = await deleteToken(args);

    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    expect(result.errorMessage).toBeUndefined();

    expect(removeTokenMock).toHaveBeenCalledWith('0.0.2222');

    const output: DeleteTokenOutput = JSON.parse(result.outputJson!);
    expect(output.deletedToken.name).toBe('MyToken');
    expect(output.deletedToken.tokenId).toBe('0.0.2222');
  });

  test('returns failure when no name or id provided', async () => {
    const logger = makeLogger();

    setupDeleteZustandHelperMock(MockedHelper, {});

    const { api } = makeApiMocks({ network: 'testnet' });
    const args = makeArgs(api, logger, {});

    const result = await deleteToken(args);

    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.outputJson).toBeUndefined();
  });

  test('returns failure when token with given id not found', async () => {
    const logger = makeLogger();

    setupDeleteZustandHelperMock(MockedHelper, {
      getToken: jest.fn().mockReturnValue(null),
    });

    const { api } = makeApiMocks({
      network: 'testnet',
      alias: { list: jest.fn().mockReturnValue([]) },
    });
    const args = makeArgs(api, logger, { id: '0.0.9999' });

    const result = await deleteToken(args);

    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain(
      "Token with ID '0.0.9999' not found in state",
    );
    expect(result.outputJson).toBeUndefined();
  });

  test('returns failure when token with given name not found', async () => {
    const logger = makeLogger();

    setupDeleteZustandHelperMock(MockedHelper, {});

    const { api } = makeApiMocks({
      network: 'testnet',
      alias: {
        resolve: jest.fn().mockReturnValue(null),
        list: jest.fn().mockReturnValue([]),
      },
    });
    const args = makeArgs(api, logger, { name: 'nonexistent-token' });

    const result = await deleteToken(args);

    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain(
      "Token with name 'nonexistent-token' not found",
    );
    expect(result.outputJson).toBeUndefined();
  });

  test('returns failure when removeToken throws', async () => {
    const logger = makeLogger();

    setupDeleteZustandHelperMock(MockedHelper, {
      getToken: jest.fn().mockReturnValue(mockDeleteTokens.basic),
      removeToken: jest.fn().mockImplementation(() => {
        throw new Error('state error');
      }),
    });

    const { api } = makeApiMocks({
      network: 'testnet',
      alias: { list: jest.fn().mockReturnValue([]) },
    });
    const args = makeArgs(api, logger, { id: '0.0.1111' });

    const result = await deleteToken(args);

    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain('Failed to delete token');
    expect(result.errorMessage).toContain('state error');
    expect(result.outputJson).toBeUndefined();
  });

  test('removes aliases of the token for current network', async () => {
    const logger = makeLogger();
    const removeTokenMock = jest.fn();

    setupDeleteZustandHelperMock(MockedHelper, {
      getToken: jest.fn().mockReturnValue(mockDeleteTokens.withAlias),
      removeToken: removeTokenMock,
    });

    const removeMock = jest.fn();
    const { api } = makeApiMocks({
      network: 'testnet',
      alias: {
        list: jest.fn().mockReturnValue(mockDeleteAliasRecords.mixedEntities),
        remove: removeMock,
      },
    });
    const args = makeArgs(api, logger, { id: '0.0.4444' });

    const result = await deleteToken(args);

    expect(removeMock).toHaveBeenCalledTimes(1);
    expect(removeMock).toHaveBeenCalledWith('my-token-alias', 'testnet');

    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    expect(result.errorMessage).toBeUndefined();

    const output: DeleteTokenOutput = JSON.parse(result.outputJson!);
    expect(output.deletedToken.name).toBe('AliasedToken');
    expect(output.deletedToken.tokenId).toBe('0.0.4444');
    expect(output.removedAliases).toHaveLength(1);
    expect(output.removedAliases![0]).toBe('my-token-alias (testnet)');
  });

  test('does not include removedAliases when no aliases exist', async () => {
    const logger = makeLogger();

    setupDeleteZustandHelperMock(MockedHelper, {
      getToken: jest.fn().mockReturnValue(mockDeleteTokens.basic),
      removeToken: jest.fn(),
    });

    const { api } = makeApiMocks({
      network: 'testnet',
      alias: { list: jest.fn().mockReturnValue([]) },
    });
    const args = makeArgs(api, logger, { id: '0.0.1111' });

    const result = await deleteToken(args);

    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    expect(result.errorMessage).toBeUndefined();

    const output: DeleteTokenOutput = JSON.parse(result.outputJson!);
    expect(output.removedAliases).toBeUndefined();
  });

  test('prefers id over name when both are provided', async () => {
    const logger = makeLogger();
    const removeTokenMock = jest.fn();

    setupDeleteZustandHelperMock(MockedHelper, {
      getToken: jest.fn().mockReturnValue(mockDeleteTokens.basic),
      removeToken: removeTokenMock,
    });

    const { api } = makeApiMocks({
      network: 'testnet',
      alias: { list: jest.fn().mockReturnValue([]) },
    });
    const args = makeArgs(api, logger, { id: '0.0.1111', name: 'some-alias' });

    const result = await deleteToken(args);

    expect(result).toBeDefined();
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();
    expect(result.errorMessage).toBeUndefined();

    expect(removeTokenMock).toHaveBeenCalledWith('0.0.1111');

    const output: DeleteTokenOutput = JSON.parse(result.outputJson!);
    expect(output.deletedToken.tokenId).toBe('0.0.1111');
  });
});

import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import '@/core/utils/json-serialize';

import { assertOutput } from '@/__tests__/utils/assert-output';
import { KeyAlgorithm } from '@/core';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { KeyManager } from '@/core/services/kms/kms-types.interface';
import { AliasType } from '@/core/types/shared.types';
import {
  tokenDelete,
  TokenDeleteOutputSchema,
} from '@/plugins/token/commands/delete';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import {
  makeDeleteApiMocks,
  makeDeleteSuccessMocks,
  makeLogger,
  mockZustandTokenStateHelper,
} from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

const makeArgs = (
  api: ReturnType<typeof makeDeleteSuccessMocks>['api'],
  argsOverrides?: Record<string, unknown>,
): CommandHandlerArgs => ({
  args: {
    token: '0.0.123456',
    adminKey: ['ed25519:private:a'.padEnd(80, 'a')],
    keyManager: undefined,
    stateOnly: false,
    ...argsOverrides,
  },
  api,
  state: api.state,
  config: api.config,
  logger: makeLogger(),
});

describe('tokenDelete - network delete (stateOnly=false)', () => {
  beforeEach(() => {
    mockZustandTokenStateHelper(MockedHelper, {
      getToken: jest.fn().mockReturnValue(null),
      removeToken: jest.fn(),
    });
  });

  describe('success scenarios', () => {
    test('happy path by token ID - returns transactionId, tokenId, network', async () => {
      const { api } = makeDeleteSuccessMocks();
      const args = makeArgs(api);

      const result = await tokenDelete(args);

      const output = assertOutput(result.result, TokenDeleteOutputSchema);
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');
      expect(output.deletedToken.tokenId).toBe('0.0.123456');
      expect(output.deletedToken.name).toBe('TestToken');
      expect(output.network).toBe('testnet');
      expect(output.removedAliases).toBeUndefined();
    });

    test('happy path by alias - resolves to token ID', async () => {
      const { api } = makeDeleteSuccessMocks();
      const args = makeArgs(api, { token: 'my-token' });

      const result = await tokenDelete(args);

      const output = assertOutput(result.result, TokenDeleteOutputSchema);
      expect(output.deletedToken.tokenId).toBe('0.0.12345');
    });

    test('token in local state - state cleaned up, aliases removed', async () => {
      const mockRemoveToken = jest.fn();
      mockZustandTokenStateHelper(MockedHelper, {
        getToken: jest.fn().mockReturnValue({
          tokenId: '0.0.123456',
          name: 'TestToken',
        }),
        removeToken: mockRemoveToken,
      });

      const { api } = makeDeleteSuccessMocks();
      (api.alias.list as jest.Mock).mockReturnValue([
        {
          alias: 'my-token',
          entityId: '0.0.123456',
          type: AliasType.Token,
          network: 'testnet',
        },
      ]);
      const args = makeArgs(api);

      const result = await tokenDelete(args);

      const output = assertOutput(result.result, TokenDeleteOutputSchema);
      expect(output.removedAliases).toEqual(['my-token (testnet)']);
      expect(api.alias.remove).toHaveBeenCalledWith('my-token', 'testnet');
      expect(mockRemoveToken).toHaveBeenCalledWith('testnet:0.0.123456');
    });

    test('token NOT in local state - tx succeeds, no state cleanup', async () => {
      mockZustandTokenStateHelper(MockedHelper, {
        getToken: jest.fn().mockReturnValue(null),
        removeToken: jest.fn(),
      });

      const { api } = makeDeleteSuccessMocks();
      const args = makeArgs(api);

      const result = await tokenDelete(args);

      const output = assertOutput(result.result, TokenDeleteOutputSchema);
      expect(output.removedAliases).toBeUndefined();
    });

    test('token name falls back to mirror node name when not in state', async () => {
      mockZustandTokenStateHelper(MockedHelper, {
        getToken: jest.fn().mockReturnValue(null),
        removeToken: jest.fn(),
      });

      const { api } = makeDeleteSuccessMocks({
        tokenInfo: { name: 'MirrorName' },
      });
      const args = makeArgs(api);

      const result = await tokenDelete(args);

      const output = assertOutput(result.result, TokenDeleteOutputSchema);
      expect(output.deletedToken.name).toBe('MirrorName');
    });

    test('auto-resolves admin key from KMS when not provided', async () => {
      const { api } = makeDeleteSuccessMocks();
      (api.kms.findByPublicKey as jest.Mock).mockReturnValue({
        keyRefId: 'kms-key-ref-id',
        publicKey: 'admin-public-key',
        keyManager: KeyManager.local,
        keyAlgorithm: KeyAlgorithm.ED25519,
        createdAt: '',
        updatedAt: '',
      });
      const args = makeArgs(api, { adminKey: undefined });

      const result = await tokenDelete(args);

      const output = assertOutput(result.result, TokenDeleteOutputSchema);
      expect(output.transactionId).toBeDefined();
      expect(output.deletedToken.tokenId).toBe('0.0.123456');
    });
  });

  describe('error scenarios', () => {
    test('throws NotFoundError when token not found', async () => {
      const { api } = makeDeleteSuccessMocks();
      const args = makeArgs(api, { token: 'nonexistent-token' });

      await expect(tokenDelete(args)).rejects.toThrow(NotFoundError);
    });

    test('throws ValidationError when token has no admin key (immutable)', async () => {
      const { api } = makeDeleteSuccessMocks({
        tokenInfo: { admin_key: null },
      });
      const args = makeArgs(api);

      await expect(tokenDelete(args)).rejects.toThrow(ValidationError);
      await expect(tokenDelete(args)).rejects.toThrow('Token has no admin key');
    });

    test('throws TransactionError when transaction fails', async () => {
      const { api } = makeDeleteSuccessMocks();
      (api.txExecute.execute as jest.Mock).mockResolvedValue({
        success: false,
        transactionId: '0.0.123@1234567890.000000000',
      });
      const args = makeArgs(api);

      await expect(tokenDelete(args)).rejects.toThrow(TransactionError);
    });

    test('throws ValidationError when admin-key not provided and not in KMS', async () => {
      const { api } = makeDeleteSuccessMocks();
      (api.kms.findByPublicKey as jest.Mock).mockReturnValue(undefined);
      const args = makeArgs(api, { adminKey: undefined });

      await expect(tokenDelete(args)).rejects.toThrow(ValidationError);
      await expect(tokenDelete(args)).rejects.toThrow(
        'Not enough admin key(s) not found in key manager for this token. Provide --admin-key.',
      );
    });
  });
});

describe('tokenDelete - state-only (stateOnly=true)', () => {
  beforeEach(() => {
    mockZustandTokenStateHelper(MockedHelper, {
      getToken: jest.fn().mockReturnValue({
        tokenId: '0.0.123456',
        name: 'TestToken',
      }),
      removeToken: jest.fn(),
    });
  });

  const makeStateOnlyArgs = (
    api: ReturnType<typeof makeDeleteApiMocks>['api'],
    argsOverrides?: Record<string, unknown>,
  ): CommandHandlerArgs => ({
    args: {
      token: '0.0.123456',
      stateOnly: true,
      ...argsOverrides,
    },
    api,
    state: api.state,
    config: api.config,
    logger: makeLogger(),
  });

  test('happy path - removes token from state, returns output without transactionId', async () => {
    const mockRemoveToken = jest.fn();
    mockZustandTokenStateHelper(MockedHelper, {
      getToken: jest.fn().mockReturnValue({
        tokenId: '0.0.123456',
        name: 'TestToken',
      }),
      removeToken: mockRemoveToken,
    });

    const { api } = makeDeleteApiMocks({
      entityId: '0.0.123456',
      alias: { list: jest.fn().mockReturnValue([]), remove: jest.fn() },
    });
    const args = makeStateOnlyArgs(api);

    const result = await tokenDelete(args);

    const output = assertOutput(result.result, TokenDeleteOutputSchema);
    expect(output.transactionId).toBeUndefined();
    expect(output.deletedToken.tokenId).toBe('0.0.123456');
    expect(output.deletedToken.name).toBe('TestToken');
    expect(output.network).toBe('testnet');
    expect(mockRemoveToken).toHaveBeenCalledWith('testnet:0.0.123456');
  });

  test('removes all aliases for token', async () => {
    const mockRemoveToken = jest.fn();
    mockZustandTokenStateHelper(MockedHelper, {
      getToken: jest.fn().mockReturnValue({
        tokenId: '0.0.123456',
        name: 'TestToken',
      }),
      removeToken: mockRemoveToken,
    });

    const { api } = makeDeleteApiMocks({
      entityId: '0.0.123456',
      alias: {
        list: jest.fn().mockReturnValue([
          {
            alias: 'alias-one',
            entityId: '0.0.123456',
            type: AliasType.Token,
            network: 'testnet',
          },
          {
            alias: 'alias-two',
            entityId: '0.0.123456',
            type: AliasType.Token,
            network: 'testnet',
          },
        ]),
        remove: jest.fn(),
      },
    });
    const args = makeStateOnlyArgs(api);

    const result = await tokenDelete(args);

    const output = assertOutput(result.result, TokenDeleteOutputSchema);
    expect(output.removedAliases).toEqual([
      'alias-one (testnet)',
      'alias-two (testnet)',
    ]);
    expect(api.alias.remove).toHaveBeenCalledTimes(2);
  });

  test('throws NotFoundError when token not in state', async () => {
    mockZustandTokenStateHelper(MockedHelper, {
      getToken: jest.fn().mockReturnValue(null),
      removeToken: jest.fn(),
    });

    const { api } = makeDeleteApiMocks({ entityId: '0.0.123456' });
    const args = makeStateOnlyArgs(api);

    await expect(tokenDelete(args)).rejects.toThrow(NotFoundError);
    await expect(tokenDelete(args)).rejects.toThrow('Token not found in state');
  });

  test('throws ValidationError when --state-only and --admin-key used together', async () => {
    const { api } = makeDeleteApiMocks({ entityId: '0.0.123456' });
    const args = makeStateOnlyArgs(api, {
      adminKey: ['ed25519:private:a'.padEnd(80, 'a')],
    });

    await expect(tokenDelete(args)).rejects.toThrow(ValidationError);
    await expect(tokenDelete(args)).rejects.toThrow('mutually exclusive');
  });
});

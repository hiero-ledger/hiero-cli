import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import '@/core/utils/json-serialize';

import { MOCK_FREEZE_PUBLIC_KEY } from '@/__tests__/mocks/fixtures';
import { assertOutput } from '@/__tests__/utils/assert-output';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import {
  tokenFreeze,
  TokenFreezeOutputSchema,
} from '@/plugins/token/commands/freeze';

import { makeFreezeSuccessMocks, makeLogger } from './helpers/mocks';

const FREEZE_KEY_ARG = `ed25519:private:${'a'.repeat(64)}`;

const makeArgs = (
  api: ReturnType<typeof makeFreezeSuccessMocks>['api'],
  argsOverrides?: Record<string, unknown>,
): CommandHandlerArgs => ({
  args: {
    token: '0.0.123456',
    account: '0.0.5678',
    freezeKey: FREEZE_KEY_ARG,
    keyManager: undefined,
    ...argsOverrides,
  },
  api,
  state: api.state,
  config: api.config,
  logger: makeLogger(),
});

describe('tokenFreeze', () => {
  describe('success scenarios', () => {
    test('freezes account by token ID and account ID', async () => {
      const { api } = makeFreezeSuccessMocks();
      const args = makeArgs(api);

      const result = await tokenFreeze(args);

      const output = assertOutput(result.result, TokenFreezeOutputSchema);
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.accountId).toBe('0.0.5678');
      expect(output.network).toBe('testnet');
    });

    test('freezes account resolved from token alias', async () => {
      const { api } = makeFreezeSuccessMocks();
      const args = makeArgs(api, { token: 'my-token' });

      const result = await tokenFreeze(args);

      const output = assertOutput(result.result, TokenFreezeOutputSchema);
      expect(output.tokenId).toBe('0.0.12345');
    });

    test('freezes account resolved from EVM address via identityResolution', async () => {
      const evmAddress = '0x' + 'a'.repeat(40);
      const { api } = makeFreezeSuccessMocks();
      (api.identityResolution.resolveAccount as jest.Mock).mockResolvedValue({
        accountId: '0.0.9999',
        accountPublicKey: 'account-public-key',
      });
      const args = makeArgs(api, { account: evmAddress });

      const result = await tokenFreeze(args);

      const output = assertOutput(result.result, TokenFreezeOutputSchema);
      expect(output.accountId).toBe('0.0.9999');
    });

    test('calls createFreezeTransaction with correct tokenId and accountId', async () => {
      const { api, mockFreezeTransaction } = makeFreezeSuccessMocks();
      const args = makeArgs(api);

      await tokenFreeze(args);

      expect(api.token.createFreezeTransaction).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        accountId: '0.0.5678',
      });
      expect(api.txSign.sign).toHaveBeenCalledWith(mockFreezeTransaction, [
        'freeze-key-ref-id',
      ]);
    });
  });

  describe('error scenarios', () => {
    test('throws NotFoundError when token not found', async () => {
      const { api } = makeFreezeSuccessMocks();
      const args = makeArgs(api, { token: 'nonexistent-token' });

      await expect(tokenFreeze(args)).rejects.toThrow(NotFoundError);
    });

    test('throws ValidationError when token has no freeze key', async () => {
      const { api } = makeFreezeSuccessMocks({
        tokenInfo: { freeze_key: null },
      });
      const args = makeArgs(api);

      await expect(tokenFreeze(args)).rejects.toThrow(ValidationError);
      await expect(tokenFreeze(args)).rejects.toThrow(
        'Token has no freeze key',
      );
    });

    test('throws ValidationError when freeze key mismatches token freeze key', async () => {
      const { api } = makeFreezeSuccessMocks({
        tokenInfo: { freeze_key: { key: 'different-freeze-key' } },
        freezeKeyPublicKey: MOCK_FREEZE_PUBLIC_KEY,
      });
      const args = makeArgs(api);

      await expect(tokenFreeze(args)).rejects.toThrow(ValidationError);
      await expect(tokenFreeze(args)).rejects.toThrow('Freeze key mismatch');
    });

    test('throws NotFoundError when account does not exist', async () => {
      const { api } = makeFreezeSuccessMocks();
      (api.identityResolution.resolveAccount as jest.Mock).mockRejectedValue(
        new NotFoundError('Account not found'),
      );
      const args = makeArgs(api);

      await expect(tokenFreeze(args)).rejects.toThrow(NotFoundError);
    });

    test('throws TransactionError when transaction fails', async () => {
      const { api } = makeFreezeSuccessMocks();
      (api.txExecute.execute as jest.Mock).mockResolvedValue({
        success: false,
        transactionId: '0.0.123@1234567890.000000000',
      });
      const args = makeArgs(api);

      await expect(tokenFreeze(args)).rejects.toThrow(TransactionError);
    });
  });
});

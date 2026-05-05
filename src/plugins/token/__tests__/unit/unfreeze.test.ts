import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import '@/core/utils/json-serialize';

import { assertOutput } from '@/__tests__/utils/assert-output';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import {
  tokenUnfreeze,
  TokenUnfreezeOutputSchema,
} from '@/plugins/token/commands/unfreeze';

import { makeLogger, makeUnfreezeSuccessMocks } from './helpers/mocks';

const FREEZE_KEY_ARG = `ed25519:private:${'a'.repeat(64)}`;

const makeArgs = (
  api: ReturnType<typeof makeUnfreezeSuccessMocks>['api'],
  argsOverrides?: Record<string, unknown>,
): CommandHandlerArgs => ({
  args: {
    token: '0.0.123456',
    account: '0.0.5678',
    freezeKey: [FREEZE_KEY_ARG],
    keyManager: undefined,
    ...argsOverrides,
  },
  api,
  state: api.state,
  config: api.config,
  logger: makeLogger(),
});

describe('tokenUnfreeze', () => {
  describe('success scenarios', () => {
    test('unfreezes account by token ID and account ID', async () => {
      const { api } = makeUnfreezeSuccessMocks();
      const args = makeArgs(api);

      const result = await tokenUnfreeze(args);

      const output = assertOutput(result.result, TokenUnfreezeOutputSchema);
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.accountId).toBe('0.0.5678');
      expect(output.network).toBe('testnet');
    });

    test('unfreezes account resolved from token alias', async () => {
      const { api } = makeUnfreezeSuccessMocks();
      const args = makeArgs(api, { token: 'my-token' });

      const result = await tokenUnfreeze(args);

      const output = assertOutput(result.result, TokenUnfreezeOutputSchema);
      expect(output.tokenId).toBe('0.0.12345');
    });

    test('unfreezes account resolved from EVM address via identityResolution', async () => {
      const evmAddress = '0x' + 'a'.repeat(40);
      const { api } = makeUnfreezeSuccessMocks();
      (api.identityResolution.resolveAccount as jest.Mock).mockResolvedValue({
        accountId: '0.0.9999',
        accountPublicKey: 'account-public-key',
      });
      const args = makeArgs(api, { account: evmAddress });

      const result = await tokenUnfreeze(args);

      const output = assertOutput(result.result, TokenUnfreezeOutputSchema);
      expect(output.accountId).toBe('0.0.9999');
    });

    test('calls createUnfreezeTransaction with correct tokenId and accountId', async () => {
      const { api, mockUnfreezeTransaction } = makeUnfreezeSuccessMocks();
      const args = makeArgs(api);

      await tokenUnfreeze(args);

      expect(api.token.createUnfreezeTransaction).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        accountId: '0.0.5678',
      });
      expect(api.txSign.sign).toHaveBeenCalledWith(mockUnfreezeTransaction, [
        'freeze-key-ref-id',
      ]);
    });
  });

  describe('error scenarios', () => {
    test('throws NotFoundError when token not found', async () => {
      const { api } = makeUnfreezeSuccessMocks();
      const args = makeArgs(api, { token: 'nonexistent-token' });

      await expect(tokenUnfreeze(args)).rejects.toThrow(NotFoundError);
    });

    test('throws ValidationError when token has no freeze key', async () => {
      const { api } = makeUnfreezeSuccessMocks({
        tokenInfo: { freeze_key: null },
      });
      (api.keyResolver.resolveSigningKeys as jest.Mock).mockRejectedValue(
        new ValidationError('Token has no freeze key'),
      );
      const args = makeArgs(api);

      await expect(tokenUnfreeze(args)).rejects.toThrow(ValidationError);
      await expect(tokenUnfreeze(args)).rejects.toThrow(
        'Token has no freeze key',
      );
    });

    test('throws NotFoundError when account does not exist', async () => {
      const { api } = makeUnfreezeSuccessMocks();
      (api.identityResolution.resolveAccount as jest.Mock).mockRejectedValue(
        new NotFoundError('Account not found'),
      );
      const args = makeArgs(api);

      await expect(tokenUnfreeze(args)).rejects.toThrow(NotFoundError);
    });

    test('throws TransactionError when transaction fails', async () => {
      const { api } = makeUnfreezeSuccessMocks();
      (api.txExecute.execute as jest.Mock).mockResolvedValue({
        success: false,
        transactionId: '0.0.123@1234567890.000000000',
      });
      const args = makeArgs(api);

      await expect(tokenUnfreeze(args)).rejects.toThrow(TransactionError);
    });
  });
});

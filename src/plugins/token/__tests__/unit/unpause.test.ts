import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import '@/core/utils/json-serialize';

import { assertOutput } from '@/__tests__/utils/assert-output';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { SupportedNetwork } from '@/core/types/shared.types';
import {
  tokenUnpause,
  TokenUnpauseOutputSchema,
} from '@/plugins/token/commands/unpause';

import { mockAccountIds, mockTransactionResults } from './helpers/fixtures';
import {
  makeLogger,
  makeUnpauseSuccessMocks,
  MOCK_ALIAS_TOKEN_ENTITY_ID,
  MOCK_PAUSE_KEY_REF_ID,
} from './helpers/mocks';

const PAUSE_KEY_ARG = `ed25519:private:${'a'.repeat(64)}`;

const makeArgs = (
  api: ReturnType<typeof makeUnpauseSuccessMocks>['api'],
  argsOverrides?: Record<string, unknown>,
): CommandHandlerArgs => ({
  args: {
    token: mockAccountIds.treasury,
    pauseKey: [PAUSE_KEY_ARG],
    keyManager: undefined,
    ...argsOverrides,
  },
  api,
  state: api.state,
  config: api.config,
  logger: makeLogger(),
});

describe('tokenUnpause', () => {
  describe('success scenarios', () => {
    test('unpauses token by token ID', async () => {
      const { api } = makeUnpauseSuccessMocks();
      const args = makeArgs(api);

      const result = await tokenUnpause(args);

      const output = assertOutput(result.result, TokenUnpauseOutputSchema);
      expect(output.transactionId).toBe(
        mockTransactionResults.success.transactionId,
      );
      expect(output.tokenId).toBe(mockAccountIds.treasury);
      expect(output.network).toBe(SupportedNetwork.TESTNET);
    });

    test('unpauses token resolved from alias', async () => {
      const { api } = makeUnpauseSuccessMocks();
      const args = makeArgs(api, { token: 'my-token' });

      const result = await tokenUnpause(args);

      const output = assertOutput(result.result, TokenUnpauseOutputSchema);
      expect(output.tokenId).toBe(MOCK_ALIAS_TOKEN_ENTITY_ID);
    });

    test('calls createUnpauseTransaction with correct tokenId', async () => {
      const { api, mockUnpauseTransaction } = makeUnpauseSuccessMocks();
      const args = makeArgs(api);

      await tokenUnpause(args);

      expect(api.token.createUnpauseTransaction).toHaveBeenCalledWith({
        tokenId: mockAccountIds.treasury,
      });
      expect(api.txSign.sign).toHaveBeenCalledWith(mockUnpauseTransaction, [
        MOCK_PAUSE_KEY_REF_ID,
      ]);
    });
  });

  describe('error scenarios', () => {
    test('throws NotFoundError when token not found', async () => {
      const { api } = makeUnpauseSuccessMocks();
      const args = makeArgs(api, { token: 'nonexistent-token' });

      await expect(tokenUnpause(args)).rejects.toThrow(NotFoundError);
    });

    test('throws ValidationError when token has no pause key', async () => {
      const { api } = makeUnpauseSuccessMocks({
        tokenInfo: { pause_key: null },
      });
      (
        api.keyResolver.resolveSigningKeyRefIdsFromMirrorRoleKey as jest.Mock
      ).mockRejectedValue(new ValidationError('Token has no pause key'));
      const args = makeArgs(api);

      await expect(tokenUnpause(args)).rejects.toThrow(ValidationError);
      await expect(tokenUnpause(args)).rejects.toThrow(
        'Token has no pause key',
      );
    });

    test('throws TransactionError when transaction fails', async () => {
      const { api } = makeUnpauseSuccessMocks();
      (api.txExecute.execute as jest.Mock).mockResolvedValue({
        success: false,
        transactionId: mockTransactionResults.failure.transactionId,
      });
      const args = makeArgs(api);

      await expect(tokenUnpause(args)).rejects.toThrow(TransactionError);
    });
  });
});

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
  tokenPause,
  TokenPauseOutputSchema,
} from '@/plugins/token/commands/pause';

import { mockAccountIds, mockTransactionResults } from './helpers/fixtures';
import {
  makeLogger,
  makePauseSuccessMocks,
  MOCK_ALIAS_TOKEN_ENTITY_ID,
  MOCK_PAUSE_KEY_REF_ID,
} from './helpers/mocks';

const PAUSE_KEY_ARG = `ed25519:private:${'a'.repeat(64)}`;

const makeArgs = (
  api: ReturnType<typeof makePauseSuccessMocks>['api'],
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

describe('tokenPause', () => {
  describe('success scenarios', () => {
    test('pauses token by token ID', async () => {
      const { api } = makePauseSuccessMocks();
      const args = makeArgs(api);

      const result = await tokenPause(args);

      const output = assertOutput(result.result, TokenPauseOutputSchema);
      expect(output.transactionId).toBe(
        mockTransactionResults.success.transactionId,
      );
      expect(output.tokenId).toBe(mockAccountIds.treasury);
      expect(output.network).toBe(SupportedNetwork.TESTNET);
    });

    test('pauses token resolved from alias', async () => {
      const { api } = makePauseSuccessMocks();
      const args = makeArgs(api, { token: 'my-token' });

      const result = await tokenPause(args);

      const output = assertOutput(result.result, TokenPauseOutputSchema);
      expect(output.tokenId).toBe(MOCK_ALIAS_TOKEN_ENTITY_ID);
    });

    test('calls createPauseTransaction with correct tokenId', async () => {
      const { api, mockPauseTransaction } = makePauseSuccessMocks();
      const args = makeArgs(api);

      await tokenPause(args);

      expect(api.token.createPauseTransaction).toHaveBeenCalledWith({
        tokenId: mockAccountIds.treasury,
      });
      expect(api.txSign.sign).toHaveBeenCalledWith(mockPauseTransaction, [
        MOCK_PAUSE_KEY_REF_ID,
      ]);
    });
  });

  describe('error scenarios', () => {
    test('throws NotFoundError when token not found', async () => {
      const { api } = makePauseSuccessMocks();
      const args = makeArgs(api, { token: 'nonexistent-token' });

      await expect(tokenPause(args)).rejects.toThrow(NotFoundError);
    });

    test('throws ValidationError when token has no pause key', async () => {
      const { api } = makePauseSuccessMocks({
        tokenInfo: { pause_key: null },
      });
      (api.keyResolver.resolveSigningKeys as jest.Mock).mockRejectedValue(
        new ValidationError('Token has no pause key'),
      );
      const args = makeArgs(api);

      await expect(tokenPause(args)).rejects.toThrow(ValidationError);
      await expect(tokenPause(args)).rejects.toThrow('Token has no pause key');
    });

    test('throws TransactionError when transaction fails', async () => {
      const { api } = makePauseSuccessMocks();
      (api.txExecute.execute as jest.Mock).mockResolvedValue({
        success: false,
        transactionId: mockTransactionResults.failure.transactionId,
      });
      const args = makeArgs(api);

      await expect(tokenPause(args)).rejects.toThrow(TransactionError);
    });
  });
});

import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import {
  ED25519_DER_PRIVATE_KEY,
  MOCK_ACCOUNT_ID,
  MOCK_ACCOUNT_ID_ALT,
  MOCK_HEDERA_ENTITY_ID_1,
  MOCK_OPERATOR_ACCOUNT_ID,
} from '@/__tests__/mocks/fixtures';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { SupportedNetwork } from '@/core';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { AliasType } from '@/core/types/shared.types';
import {
  tokenDeleteAllowanceNft,
  TokenDeleteAllowanceNftOutputSchema,
} from '@/plugins/token/commands/delete-allowance-nft';

import {
  makeApiMocks,
  makeLogger,
  makeTransactionResult,
  MOCK_NFT_COLLECTION_ENTITY_ID,
} from './helpers/mocks';

const OWNER_ACCOUNT = `${MOCK_ACCOUNT_ID}:${ED25519_DER_PRIVATE_KEY}`;

function makeNftMirrorMock(type = 'NON_FUNGIBLE_UNIQUE') {
  return {
    getTokenInfo: jest.fn().mockResolvedValue({ type }),
  };
}

function makeDeleteAllowanceSuccessMocks(overrides?: { spenderId?: string }) {
  const mockDeleteTx = { test: 'delete-allowance-transaction' };
  const { api, allowance, txExecute, kms } = makeApiMocks({
    allowance: {
      buildNftAllowanceDelete: jest.fn().mockReturnValue(mockDeleteTx),
    },
    txExecute: {
      execute: jest.fn().mockResolvedValue(makeTransactionResult()),
    },
    mirror: makeNftMirrorMock(),
    kms: {
      importPrivateKey: jest.fn().mockReturnValue({
        keyRefId: 'owner-key-ref-id',
        publicKey: 'owner-public-key',
      }),
    },
    alias: {
      resolve: jest.fn().mockImplementation((alias, type) => {
        if (type === AliasType.Account) {
          if (alias === 'alice') {
            return {
              entityId: MOCK_ACCOUNT_ID,
              publicKey: 'alice-pub-key',
              keyRefId: 'alice-key-ref-id',
            };
          }
          if (alias === 'bob') {
            return {
              entityId: overrides?.spenderId ?? MOCK_ACCOUNT_ID_ALT,
              publicKey: 'bob-pub-key',
              keyRefId: 'bob-key-ref-id',
            };
          }
        }
        if (type === AliasType.Token) {
          if (alias === 'my-nft-collection') {
            return { entityId: MOCK_NFT_COLLECTION_ENTITY_ID };
          }
        }
        return null;
      }),
    },
  });

  return { api, allowance, txExecute, kms, mockDeleteTx };
}

describe('tokenDeleteAllowanceNft', () => {
  describe('success scenarios', () => {
    test('delete specific serials with account-id:key format', async () => {
      const { api, allowance } = makeDeleteAllowanceSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: MOCK_HEDERA_ENTITY_ID_1,
          owner: OWNER_ACCOUNT,
          serials: '1,2,3',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenDeleteAllowanceNft(args);

      const output = assertOutput(
        result.result,
        TokenDeleteAllowanceNftOutputSchema,
      );
      expect(output.tokenId).toBe(MOCK_HEDERA_ENTITY_ID_1);
      expect(output.ownerAccountId).toBe(MOCK_ACCOUNT_ID);
      expect(output.spenderAccountId).toBeNull();
      expect(output.serials).toEqual([1, 2, 3]);
      expect(output.allSerials).toBe(false);
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');
      expect(output.network).toBe(SupportedNetwork.TESTNET);

      expect(allowance.buildNftAllowanceDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenId: MOCK_HEDERA_ENTITY_ID_1,
          ownerAccountId: MOCK_ACCOUNT_ID,
          serialNumbers: [1, 2, 3],
        }),
      );
    });

    test('delete all-serials blanket approval with spender', async () => {
      const { api, allowance } = makeDeleteAllowanceSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: MOCK_HEDERA_ENTITY_ID_1,
          owner: OWNER_ACCOUNT,
          spender: MOCK_ACCOUNT_ID_ALT,
          allSerials: true,
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenDeleteAllowanceNft(args);

      const output = assertOutput(
        result.result,
        TokenDeleteAllowanceNftOutputSchema,
      );
      expect(output.tokenId).toBe(MOCK_HEDERA_ENTITY_ID_1);
      expect(output.ownerAccountId).toBe(MOCK_ACCOUNT_ID);
      expect(output.spenderAccountId).toBe(MOCK_ACCOUNT_ID_ALT);
      expect(output.serials).toBeNull();
      expect(output.allSerials).toBe(true);

      expect(allowance.buildNftAllowanceDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenId: MOCK_HEDERA_ENTITY_ID_1,
          ownerAccountId: MOCK_ACCOUNT_ID,
          spenderAccountId: MOCK_ACCOUNT_ID_ALT,
          allSerials: true,
        }),
      );
    });

    test('owner defaults to operator when not provided', async () => {
      const operatorId = MOCK_OPERATOR_ACCOUNT_ID;
      const { api, allowance } = makeDeleteAllowanceSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: MOCK_HEDERA_ENTITY_ID_1,
          serials: '5',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenDeleteAllowanceNft(args);

      const output = assertOutput(
        result.result,
        TokenDeleteAllowanceNftOutputSchema,
      );
      expect(output.ownerAccountId).toBe(operatorId);

      expect(allowance.buildNftAllowanceDelete).toHaveBeenCalledWith(
        expect.objectContaining({ ownerAccountId: operatorId }),
      );
    });

    test('resolve token and spender by alias', async () => {
      const { api, allowance } = makeDeleteAllowanceSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: 'my-nft-collection',
          spender: 'bob',
          owner: OWNER_ACCOUNT,
          allSerials: true,
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenDeleteAllowanceNft(args);

      const output = assertOutput(
        result.result,
        TokenDeleteAllowanceNftOutputSchema,
      );
      expect(output.tokenId).toBe(MOCK_NFT_COLLECTION_ENTITY_ID);
      expect(output.spenderAccountId).toBe(MOCK_ACCOUNT_ID_ALT);

      expect(allowance.buildNftAllowanceDelete).toHaveBeenCalledWith(
        expect.objectContaining({ tokenId: MOCK_NFT_COLLECTION_ENTITY_ID }),
      );
    });
  });

  describe('error scenarios', () => {
    test('throws ValidationError when token is not an NFT', async () => {
      const { api } = makeDeleteAllowanceSuccessMocks();
      (api.mirror.getTokenInfo as jest.Mock).mockResolvedValue({
        type: 'FUNGIBLE_COMMON',
      });
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: MOCK_HEDERA_ENTITY_ID_1,
          serials: '1',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenDeleteAllowanceNft(args)).rejects.toThrow(
        ValidationError,
      );
    });

    test('throws NotFoundError when spender account not found', async () => {
      const { api } = makeDeleteAllowanceSuccessMocks();
      (api.alias.resolve as jest.Mock).mockReturnValue(null);
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: MOCK_HEDERA_ENTITY_ID_1,
          spender: 'unknown-alias',
          owner: OWNER_ACCOUNT,
          allSerials: true,
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenDeleteAllowanceNft(args)).rejects.toThrow(
        NotFoundError,
      );
    });

    test('throws TransactionError when execution fails', async () => {
      const { api } = makeDeleteAllowanceSuccessMocks();
      (api.txExecute.execute as jest.Mock).mockResolvedValue(
        makeTransactionResult({ success: false, transactionId: '' }),
      );
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: MOCK_HEDERA_ENTITY_ID_1,
          owner: OWNER_ACCOUNT,
          serials: '1',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenDeleteAllowanceNft(args)).rejects.toThrow(
        TransactionError,
      );
    });

    test('throws ZodError when neither serials nor all-serials specified', async () => {
      const { api } = makeDeleteAllowanceSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: MOCK_HEDERA_ENTITY_ID_1,
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenDeleteAllowanceNft(args)).rejects.toThrow(
        'Either --serials or --all-serials must be specified',
      );
    });

    test('throws ZodError when both serials and all-serials specified', async () => {
      const { api } = makeDeleteAllowanceSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: MOCK_HEDERA_ENTITY_ID_1,
          serials: '1,2',
          allSerials: true,
          spender: MOCK_ACCOUNT_ID_ALT,
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenDeleteAllowanceNft(args)).rejects.toThrow(
        '--serials and --all-serials are mutually exclusive',
      );
    });

    test('throws ZodError when --all-serials without --spender', async () => {
      const { api } = makeDeleteAllowanceSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: MOCK_HEDERA_ENTITY_ID_1,
          allSerials: true,
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenDeleteAllowanceNft(args)).rejects.toThrow(
        '--spender is required when using --all-serials',
      );
    });

    test('throws ZodError when --spender used with --serials', async () => {
      const { api } = makeDeleteAllowanceSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: MOCK_HEDERA_ENTITY_ID_1,
          serials: '1,2',
          spender: MOCK_ACCOUNT_ID_ALT,
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenDeleteAllowanceNft(args)).rejects.toThrow(
        '--spender is not used with --serials',
      );
    });
  });
});

import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import {
  MOCK_ACCOUNT_ID,
  MOCK_ACCOUNT_ID_ALT,
  MOCK_HEDERA_ENTITY_ID_1,
} from '@/__tests__/mocks/fixtures';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { SupportedNetwork } from '@/core';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import {
  tokenAllowanceNft,
  TokenAllowanceNftOutputSchema,
} from '@/plugins/token/commands/allowance-nft';

import {
  makeApiMocks,
  makeLogger,
  makeTransactionResult,
} from './helpers/mocks';

const OWNER_ACCOUNT_ID = MOCK_ACCOUNT_ID;
const SPENDER_ACCOUNT_ID = MOCK_ACCOUNT_ID_ALT;
const TOKEN_ID = MOCK_HEDERA_ENTITY_ID_1;
const OWNER_PRIVATE_KEY =
  '302e020100300506032b65700422042011111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111';

function makeNftMirrorMock(type = 'NON_FUNGIBLE_UNIQUE') {
  return {
    getTokenInfo: jest.fn().mockResolvedValue({ type }),
  };
}

function makeAllowanceSuccessMocks(overrides?: {
  ownerArg?: string;
  spenderId?: string;
}) {
  const mockAllowanceTx = { test: 'allowance-transaction' };
  const { api, tokens, txExecute, kms } = makeApiMocks({
    tokens: {
      createNftAllowanceApproveTransaction: jest
        .fn()
        .mockReturnValue(mockAllowanceTx),
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
              entityId: OWNER_ACCOUNT_ID,
              publicKey: 'alice-pub-key',
              keyRefId: 'alice-key-ref-id',
            };
          }
          if (alias === 'bob') {
            return {
              entityId: overrides?.spenderId ?? SPENDER_ACCOUNT_ID,
              publicKey: 'bob-pub-key',
              keyRefId: 'bob-key-ref-id',
            };
          }
        }
        if (type === AliasType.Token) {
          if (alias === 'my-nft-collection') {
            return { entityId: '0.0.54321' };
          }
        }
        return null;
      }),
    },
  });

  return { api, tokens, txExecute, kms, mockAllowanceTx };
}

describe('tokenAllowanceNft', () => {
  describe('success scenarios', () => {
    test('approve specific serials with account-id:key format', async () => {
      const { api, tokens } = makeAllowanceSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: TOKEN_ID,
          spender: SPENDER_ACCOUNT_ID,
          owner: `${OWNER_ACCOUNT_ID}:${OWNER_PRIVATE_KEY}`,
          serials: '1,2,3',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenAllowanceNft(args);

      const output = assertOutput(result.result, TokenAllowanceNftOutputSchema);
      expect(output.tokenId).toBe(TOKEN_ID);
      expect(output.ownerAccountId).toBe(OWNER_ACCOUNT_ID);
      expect(output.spenderAccountId).toBe(SPENDER_ACCOUNT_ID);
      expect(output.serials).toEqual([1, 2, 3]);
      expect(output.allSerials).toBe(false);
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');
      expect(output.network).toBe(SupportedNetwork.TESTNET);

      expect(tokens.createNftAllowanceApproveTransaction).toHaveBeenCalledWith({
        tokenId: TOKEN_ID,
        ownerAccountId: OWNER_ACCOUNT_ID,
        spenderAccountId: SPENDER_ACCOUNT_ID,
        serialNumbers: [1, 2, 3],
      });
    });

    test('approve all serials with all-serials flag', async () => {
      const { api, tokens } = makeAllowanceSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: TOKEN_ID,
          spender: SPENDER_ACCOUNT_ID,
          owner: `${OWNER_ACCOUNT_ID}:${OWNER_PRIVATE_KEY}`,
          allSerials: true,
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenAllowanceNft(args);

      const output = assertOutput(result.result, TokenAllowanceNftOutputSchema);
      expect(output.serials).toBeNull();
      expect(output.allSerials).toBe(true);

      expect(tokens.createNftAllowanceApproveTransaction).toHaveBeenCalledWith({
        tokenId: TOKEN_ID,
        ownerAccountId: OWNER_ACCOUNT_ID,
        spenderAccountId: SPENDER_ACCOUNT_ID,
        allSerials: true,
      });
    });

    test('owner defaults to operator when not provided', async () => {
      const operatorId = '0.0.100000';
      const { api, tokens } = makeAllowanceSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: TOKEN_ID,
          spender: SPENDER_ACCOUNT_ID,
          serials: '5',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenAllowanceNft(args);

      const output = assertOutput(result.result, TokenAllowanceNftOutputSchema);
      expect(output.ownerAccountId).toBe(operatorId);

      expect(tokens.createNftAllowanceApproveTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ ownerAccountId: operatorId }),
      );
    });

    test('resolve token and spender by alias', async () => {
      const { api, tokens } = makeAllowanceSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: 'my-nft-collection',
          spender: 'bob',
          owner: `${OWNER_ACCOUNT_ID}:${OWNER_PRIVATE_KEY}`,
          serials: '10',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenAllowanceNft(args);

      const output = assertOutput(result.result, TokenAllowanceNftOutputSchema);
      expect(output.tokenId).toBe('0.0.54321');
      expect(output.spenderAccountId).toBe(SPENDER_ACCOUNT_ID);

      expect(tokens.createNftAllowanceApproveTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ tokenId: '0.0.54321' }),
      );
    });
  });

  describe('error scenarios', () => {
    test('throws ValidationError when token is not an NFT', async () => {
      const { api } = makeAllowanceSuccessMocks();
      (api.mirror.getTokenInfo as jest.Mock).mockResolvedValue({
        type: 'FUNGIBLE_COMMON',
      });
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: TOKEN_ID,
          spender: SPENDER_ACCOUNT_ID,
          serials: '1',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenAllowanceNft(args)).rejects.toThrow(ValidationError);
    });

    test('throws NotFoundError when spender account not found', async () => {
      const { api } = makeAllowanceSuccessMocks();
      (api.alias.resolve as jest.Mock).mockReturnValue(null);
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: TOKEN_ID,
          spender: 'unknown-alias',
          owner: `${OWNER_ACCOUNT_ID}:${OWNER_PRIVATE_KEY}`,
          serials: '1',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenAllowanceNft(args)).rejects.toThrow(NotFoundError);
    });

    test('throws TransactionError when execution fails', async () => {
      const { api } = makeAllowanceSuccessMocks();
      (api.txExecute.execute as jest.Mock).mockResolvedValue(
        makeTransactionResult({ success: false, transactionId: '' }),
      );
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: TOKEN_ID,
          spender: SPENDER_ACCOUNT_ID,
          owner: `${OWNER_ACCOUNT_ID}:${OWNER_PRIVATE_KEY}`,
          serials: '1',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenAllowanceNft(args)).rejects.toThrow(TransactionError);
    });

    test('throws ZodError when neither serials nor all-serials specified', async () => {
      const { api } = makeAllowanceSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: TOKEN_ID,
          spender: SPENDER_ACCOUNT_ID,
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenAllowanceNft(args)).rejects.toThrow(
        'Either --serials or --all-serials must be specified',
      );
    });

    test('throws ZodError when both serials and all-serials specified', async () => {
      const { api } = makeAllowanceSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: TOKEN_ID,
          spender: SPENDER_ACCOUNT_ID,
          serials: '1,2',
          allSerials: true,
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenAllowanceNft(args)).rejects.toThrow(
        '--serials and --all-serials are mutually exclusive',
      );
    });
  });
});

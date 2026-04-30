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
import { NftAllowanceEntry } from '@/core/services/allowance';
import { AliasType } from '@/core/types/shared.types';
import {
  tokenAllowanceNft,
  TokenAllowanceNftOutputSchema,
} from '@/plugins/token/commands/allowance-nft';

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

function makeAllowanceSuccessMocks(overrides?: {
  ownerArg?: string;
  spenderId?: string;
}) {
  const mockAllowanceTx = { test: 'allowance-transaction' };
  const { api, allowance, txExecute, kms } = makeApiMocks({
    allowance: {
      buildAllowanceApprove: jest.fn().mockReturnValue(mockAllowanceTx),
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

  return { api, allowance, txExecute, kms, mockAllowanceTx };
}

describe('tokenAllowanceNft', () => {
  describe('success scenarios', () => {
    test('approve specific serials with account-id:key format', async () => {
      const { api, allowance } = makeAllowanceSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: MOCK_HEDERA_ENTITY_ID_1,
          spender: MOCK_ACCOUNT_ID_ALT,
          owner: OWNER_ACCOUNT,
          serials: '1,2,3',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenAllowanceNft(args);

      const output = assertOutput(result.result, TokenAllowanceNftOutputSchema);
      expect(output.tokenId).toBe(MOCK_HEDERA_ENTITY_ID_1);
      expect(output.ownerAccountId).toBe(MOCK_ACCOUNT_ID);
      expect(output.spenderAccountId).toBe(MOCK_ACCOUNT_ID_ALT);
      expect(output.serials).toEqual([1, 2, 3]);
      expect(output.allSerials).toBe(false);
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');
      expect(output.network).toBe(SupportedNetwork.TESTNET);

      expect(allowance.buildAllowanceApprove).toHaveBeenCalledWith([
        new NftAllowanceEntry(
          MOCK_ACCOUNT_ID,
          MOCK_ACCOUNT_ID_ALT,
          MOCK_HEDERA_ENTITY_ID_1,
          [1, 2, 3],
        ),
      ]);
    });

    test('approve all serials with all-serials flag', async () => {
      const { api, allowance } = makeAllowanceSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: MOCK_HEDERA_ENTITY_ID_1,
          spender: MOCK_ACCOUNT_ID_ALT,
          owner: OWNER_ACCOUNT,
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

      expect(allowance.buildAllowanceApprove).toHaveBeenCalledWith([
        new NftAllowanceEntry(
          MOCK_ACCOUNT_ID,
          MOCK_ACCOUNT_ID_ALT,
          MOCK_HEDERA_ENTITY_ID_1,
          undefined,
          true,
        ),
      ]);
    });

    test('owner defaults to operator when not provided', async () => {
      const operatorId = MOCK_OPERATOR_ACCOUNT_ID;
      const { api, allowance } = makeAllowanceSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: MOCK_HEDERA_ENTITY_ID_1,
          spender: MOCK_ACCOUNT_ID_ALT,
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

      expect(allowance.buildAllowanceApprove).toHaveBeenCalledWith([
        new NftAllowanceEntry(
          MOCK_OPERATOR_ACCOUNT_ID,
          MOCK_ACCOUNT_ID_ALT,
          MOCK_HEDERA_ENTITY_ID_1,
          [5],
        ),
      ]);
    });

    test('resolve token and spender by alias', async () => {
      const { api, allowance } = makeAllowanceSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: 'my-nft-collection',
          spender: 'bob',
          owner: OWNER_ACCOUNT,
          serials: '10',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenAllowanceNft(args);

      const output = assertOutput(result.result, TokenAllowanceNftOutputSchema);
      expect(output.tokenId).toBe(MOCK_NFT_COLLECTION_ENTITY_ID);
      expect(output.spenderAccountId).toBe(MOCK_ACCOUNT_ID_ALT);

      expect(allowance.buildAllowanceApprove).toHaveBeenCalledWith([
        new NftAllowanceEntry(
          MOCK_ACCOUNT_ID,
          MOCK_ACCOUNT_ID_ALT,
          MOCK_NFT_COLLECTION_ENTITY_ID,
          [10],
        ),
      ]);
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
          token: MOCK_HEDERA_ENTITY_ID_1,
          spender: MOCK_ACCOUNT_ID_ALT,
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
          token: MOCK_HEDERA_ENTITY_ID_1,
          spender: 'unknown-alias',
          owner: OWNER_ACCOUNT,
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
          token: MOCK_HEDERA_ENTITY_ID_1,
          spender: MOCK_ACCOUNT_ID_ALT,
          owner: OWNER_ACCOUNT,
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
          token: MOCK_HEDERA_ENTITY_ID_1,
          spender: MOCK_ACCOUNT_ID_ALT,
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
          token: MOCK_HEDERA_ENTITY_ID_1,
          spender: MOCK_ACCOUNT_ID_ALT,
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

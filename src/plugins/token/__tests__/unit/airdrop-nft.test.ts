import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import '@/core/utils/json-serialize';

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
import {
  tokenAirdropNft,
  TokenAirdropNftOutputSchema,
} from '@/plugins/token/commands/airdrop-nft';

import {
  makeApiMocks,
  makeLogger,
  makeTransactionResult,
} from './helpers/mocks';

const TOKEN_ID = MOCK_HEDERA_ENTITY_ID_1;
const SENDER_ACCOUNT_ID = MOCK_ACCOUNT_ID;
const RECIPIENT_1 = MOCK_ACCOUNT_ID_ALT;
const SENDER_PRIVATE_KEY =
  '302e020100300506032b65700422042011111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111';

const SENDER_WITH_KEY = `${SENDER_ACCOUNT_ID}:${SENDER_PRIVATE_KEY}`;

function makeNftMirrorMock(type = 'NON_FUNGIBLE_UNIQUE') {
  return {
    getTokenInfo: jest.fn().mockResolvedValue({ type }),
  };
}

function makeAirdropSuccessMocks(overrides?: { kmsImportKey?: jest.Mock }) {
  const mockAirdropTx = { test: 'airdrop-nft-transaction' };
  const { api, tokens, txExecute, kms } = makeApiMocks({
    tokens: {
      createAirdropNftTransaction: jest.fn().mockReturnValue(mockAirdropTx),
    },
    txExecute: {
      execute: jest.fn().mockResolvedValue(makeTransactionResult()),
    },
    mirror: makeNftMirrorMock(),
    kms: {
      importPrivateKey:
        overrides?.kmsImportKey ??
        jest.fn().mockReturnValue({
          keyRefId: 'sender-key-ref-id',
          publicKey: 'sender-public-key',
        }),
    },
    alias: {
      resolve: jest.fn().mockReturnValue(null),
    },
  });

  return { api, tokens, txExecute, kms, mockAirdropTx };
}

describe('tokenAirdropNft', () => {
  describe('success scenarios', () => {
    test('should airdrop single serial to single recipient using account-id:private-key format', async () => {
      const { api, tokens } = makeAirdropSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: TOKEN_ID,
          to: [RECIPIENT_1],
          serials: ['1'],
          from: SENDER_WITH_KEY,
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenAirdropNft(args);

      const output = assertOutput(result.result, TokenAirdropNftOutputSchema);
      expect(output.tokenId).toBe(TOKEN_ID);
      expect(output.from).toBe(SENDER_ACCOUNT_ID);
      expect(output.recipients).toHaveLength(1);
      expect(output.recipients[0].to).toBe(RECIPIENT_1);
      expect(output.recipients[0].serials).toEqual([1]);
      expect(output.network).toBe(SupportedNetwork.TESTNET);

      expect(tokens.createAirdropNftTransaction).toHaveBeenCalledWith({
        tokenId: TOKEN_ID,
        senderAccountId: SENDER_ACCOUNT_ID,
        transfers: [{ recipientAccountId: RECIPIENT_1, serialNumbers: [1] }],
      });
    });

    test('should airdrop multiple serials to single recipient', async () => {
      const { api, tokens } = makeAirdropSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: TOKEN_ID,
          to: [RECIPIENT_1],
          serials: ['1,2,3'],
          from: SENDER_WITH_KEY,
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenAirdropNft(args);

      const output = assertOutput(result.result, TokenAirdropNftOutputSchema);
      expect(output.recipients[0].serials).toEqual([1, 2, 3]);

      expect(tokens.createAirdropNftTransaction).toHaveBeenCalledWith({
        tokenId: TOKEN_ID,
        senderAccountId: SENDER_ACCOUNT_ID,
        transfers: [
          { recipientAccountId: RECIPIENT_1, serialNumbers: [1, 2, 3] },
        ],
      });
    });

    test('should airdrop to multiple recipients with different serials', async () => {
      const { api, tokens } = makeAirdropSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: TOKEN_ID,
          to: [RECIPIENT_1, '0.0.300001'],
          serials: ['1,2', '3,4'],
          from: SENDER_WITH_KEY,
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenAirdropNft(args);

      const output = assertOutput(result.result, TokenAirdropNftOutputSchema);
      expect(output.recipients).toHaveLength(2);
      expect(output.recipients[0]).toEqual({
        to: RECIPIENT_1,
        serials: [1, 2],
      });
      expect(output.recipients[1]).toEqual({
        to: '0.0.300001',
        serials: [3, 4],
      });

      expect(tokens.createAirdropNftTransaction).toHaveBeenCalledWith({
        tokenId: TOKEN_ID,
        senderAccountId: SENDER_ACCOUNT_ID,
        transfers: [
          { recipientAccountId: RECIPIENT_1, serialNumbers: [1, 2] },
          { recipientAccountId: '0.0.300001', serialNumbers: [3, 4] },
        ],
      });
    });

    test('should use operator as sender when --from is not provided', async () => {
      const { api, tokens } = makeAirdropSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: TOKEN_ID,
          to: [RECIPIENT_1],
          serials: ['1'],
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenAirdropNft(args);

      const output = assertOutput(result.result, TokenAirdropNftOutputSchema);
      expect(output.from).toBe('0.0.100000');
      expect(tokens.createAirdropNftTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ senderAccountId: '0.0.100000' }),
      );
    });

    test('should resolve recipient alias to account ID', async () => {
      const { api } = makeApiMocks({
        tokens: {
          createAirdropNftTransaction: jest
            .fn()
            .mockReturnValue({ test: 'tx' }),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(makeTransactionResult()),
        },
        mirror: makeNftMirrorMock(),
        alias: {
          resolve: jest.fn().mockImplementation((alias, type) => {
            if (type === 'account' && alias === 'alice') {
              return {
                entityId: '0.0.200000',
                keyRefId: 'alice-key-ref-id',
                publicKey: 'alice-pub',
              };
            }
            return null;
          }),
        },
      });
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: TOKEN_ID,
          to: ['alice'],
          serials: ['5'],
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenAirdropNft(args);

      const output = assertOutput(result.result, TokenAirdropNftOutputSchema);
      expect(output.recipients[0].to).toBe('0.0.200000');
    });

    test('should resolve token alias to token ID', async () => {
      const { api, tokens } = makeApiMocks({
        tokens: {
          createAirdropNftTransaction: jest
            .fn()
            .mockReturnValue({ test: 'tx' }),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(makeTransactionResult()),
        },
        mirror: makeNftMirrorMock(),
        alias: {
          resolve: jest.fn().mockImplementation((alias, type) => {
            if (type === 'token' && alias === 'my-nft-collection') {
              return { entityId: '0.0.54321' };
            }
            return null;
          }),
        },
      });
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: 'my-nft-collection',
          to: [RECIPIENT_1],
          serials: ['1'],
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenAirdropNft(args);

      const output = assertOutput(result.result, TokenAirdropNftOutputSchema);
      expect(output.tokenId).toBe('0.0.54321');
      expect(tokens.createAirdropNftTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ tokenId: '0.0.54321' }),
      );
    });
  });

  describe('validation errors', () => {
    test('should throw ValidationError when to/serials count mismatch', async () => {
      const { api } = makeAirdropSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: TOKEN_ID,
          to: [RECIPIENT_1, '0.0.300001'],
          serials: ['1'],
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenAirdropNft(args)).rejects.toThrow(
        'Number of --to flags (2) must match number of --serials flags (1)',
      );
    });

    test('should throw ValidationError when duplicate serials across recipients', async () => {
      const { api } = makeAirdropSuccessMocks();
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: TOKEN_ID,
          to: [RECIPIENT_1, '0.0.300001'],
          serials: ['1,2', '2,3'],
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenAirdropNft(args)).rejects.toThrow(
        'Duplicate serial numbers across recipients: 2',
      );
    });

    test('should throw ValidationError when total serials exceed 20', async () => {
      const { api } = makeAirdropSuccessMocks();
      const logger = makeLogger();

      const serials = Array.from({ length: 3 }, (_, i) =>
        Array.from({ length: 7 }, (__, j) => i * 7 + j + 1).join(','),
      );
      const toList = Array.from({ length: 3 }, (_, i) => `0.0.${300000 + i}`);

      const args: CommandHandlerArgs = {
        args: {
          token: TOKEN_ID,
          to: toList,
          serials,
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenAirdropNft(args)).rejects.toThrow(ValidationError);
      await expect(tokenAirdropNft(args)).rejects.toThrow(
        'Too many serials: 21. Maximum allowed is 20 per transaction.',
      );
    });

    test('should throw ValidationError when token is not an NFT', async () => {
      const { api } = makeApiMocks({
        tokens: {
          createAirdropNftTransaction: jest
            .fn()
            .mockReturnValue({ test: 'tx' }),
        },
        mirror: {
          getTokenInfo: jest
            .fn()
            .mockResolvedValue({ type: 'FUNGIBLE_COMMON' }),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
      });
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: TOKEN_ID,
          to: [RECIPIENT_1],
          serials: ['1'],
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenAirdropNft(args)).rejects.toThrow(ValidationError);
      await expect(tokenAirdropNft(args)).rejects.toThrow(
        'Token is not an NFT',
      );
    });
  });

  describe('not found errors', () => {
    test('should throw NotFoundError when token alias is not found', async () => {
      const { api } = makeApiMocks({
        alias: { resolve: jest.fn().mockReturnValue(null) },
      });
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: 'nonexistent-nft',
          to: [RECIPIENT_1],
          serials: ['1'],
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenAirdropNft(args)).rejects.toThrow(NotFoundError);
      await expect(tokenAirdropNft(args)).rejects.toThrow(
        'Token "nonexistent-nft" not found on testnet',
      );
    });

    test('should throw NotFoundError when recipient alias is not found', async () => {
      const { api } = makeApiMocks({
        mirror: makeNftMirrorMock(),
        alias: {
          resolve: jest.fn().mockImplementation((alias, type) => {
            if (type === 'token') return null;
            if (alias === 'unknown-account') return null;
            return null;
          }),
        },
      });
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: TOKEN_ID,
          to: ['unknown-account'],
          serials: ['1'],
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenAirdropNft(args)).rejects.toThrow(NotFoundError);
      await expect(tokenAirdropNft(args)).rejects.toThrow(
        'Account "unknown-account" not found on testnet',
      );
    });
  });

  describe('transaction errors', () => {
    test('should throw TransactionError when transaction execution fails', async () => {
      const { api } = makeApiMocks({
        tokens: {
          createAirdropNftTransaction: jest
            .fn()
            .mockReturnValue({ test: 'tx' }),
        },
        txExecute: {
          execute: jest
            .fn()
            .mockResolvedValue(makeTransactionResult({ success: false })),
        },
        mirror: makeNftMirrorMock(),
        alias: { resolve: jest.fn().mockReturnValue(null) },
      });
      const logger = makeLogger();

      const args: CommandHandlerArgs = {
        args: {
          token: TOKEN_ID,
          to: [RECIPIENT_1],
          serials: ['1'],
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenAirdropNft(args)).rejects.toThrow(TransactionError);
      await expect(tokenAirdropNft(args)).rejects.toThrow('NFT airdrop failed');
    });
  });
});

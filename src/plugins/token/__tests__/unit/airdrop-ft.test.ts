import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import '@/core/utils/json-serialize';

import { makeConfigMock, makeStateMock } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { TransactionError, ValidationError } from '@/core/errors';
import {
  tokenAirdropFt,
  TokenAirdropFtOutputSchema,
} from '@/plugins/token/commands/airdrop-ft';

import { mockTransactionResults } from './helpers/fixtures';
import { makeApiMocks, makeLogger } from './helpers/mocks';

describe('tokenAirdropFt', () => {
  const mockAirdropTransaction = { test: 'airdrop-transaction' };

  const makeSuccessResult = (overrides = {}) => ({
    ...mockTransactionResults.success,
    transactionId: '0.0.123@1234567890.123456789',
    consensusTimestamp: '1234567890.123456789',
    ...overrides,
  });

  describe('success scenarios', () => {
    test('should airdrop tokens to a single recipient using account-id:private-key format', async () => {
      const { api, tokens } = makeApiMocks({
        tokens: {
          createAirdropFtTransaction: jest
            .fn()
            .mockReturnValue(mockAirdropTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(makeSuccessResult()),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: '6' }),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'imported-key-ref-id',
            publicKey: 'imported-public-key',
          }),
        },
      });

      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          to: ['0.0.789012'],
          from: '0.0.345678:2222222222222222222222222222222222222222222222222222222222222222',
          amount: ['100'],
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger: makeLogger(),
      };

      const result = await tokenAirdropFt(args);

      const output = assertOutput(result.result, TokenAirdropFtOutputSchema);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.from).toBe('0.0.345678');
      expect(output.recipients).toHaveLength(1);
      expect(output.recipients[0].to).toBe('0.0.789012');
      expect(output.recipients[0].amount).toBe(100000000n);
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');

      expect(tokens.createAirdropFtTransaction).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        senderAccountId: '0.0.345678',
        transfers: [{ recipientAccountId: '0.0.789012', amount: 100000000n }],
      });
    });

    test('should airdrop tokens to multiple recipients with index-mapped amounts', async () => {
      const { api, tokens } = makeApiMocks({
        tokens: {
          createAirdropFtTransaction: jest
            .fn()
            .mockReturnValue(mockAirdropTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(makeSuccessResult()),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: '2' }),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'sender-key-ref-id',
            publicKey: 'sender-public-key',
          }),
        },
      });

      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          to: ['0.0.100001', '0.0.100002', '0.0.100003'],
          from: '0.0.345678:2222222222222222222222222222222222222222222222222222222222222222',
          amount: ['10', '20', '30'],
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger: makeLogger(),
      };

      const result = await tokenAirdropFt(args);

      const output = assertOutput(result.result, TokenAirdropFtOutputSchema);
      expect(output.recipients).toHaveLength(3);
      expect(output.recipients[0]).toEqual({ to: '0.0.100001', amount: 1000n });
      expect(output.recipients[1]).toEqual({ to: '0.0.100002', amount: 2000n });
      expect(output.recipients[2]).toEqual({ to: '0.0.100003', amount: 3000n });

      expect(tokens.createAirdropFtTransaction).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        senderAccountId: '0.0.345678',
        transfers: [
          { recipientAccountId: '0.0.100001', amount: 1000n },
          { recipientAccountId: '0.0.100002', amount: 2000n },
          { recipientAccountId: '0.0.100003', amount: 3000n },
        ],
      });
    });

    test('should use operator as sender when --from is not provided', async () => {
      const { api, tokens } = makeApiMocks({
        tokens: {
          createAirdropFtTransaction: jest
            .fn()
            .mockReturnValue(mockAirdropTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(makeSuccessResult()),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: '0' }),
        },
      });

      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          to: ['0.0.789012'],
          amount: ['50'],
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger: makeLogger(),
      };

      const result = await tokenAirdropFt(args);

      const output = assertOutput(result.result, TokenAirdropFtOutputSchema);
      expect(output.from).toBe('0.0.100000'); // operator account from mock
      expect(tokens.createAirdropFtTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ senderAccountId: '0.0.100000' }),
      );
    });

    test('should resolve recipient alias to account ID', async () => {
      const { api } = makeApiMocks({
        tokens: {
          createAirdropFtTransaction: jest
            .fn()
            .mockReturnValue(mockAirdropTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(makeSuccessResult()),
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias) => {
            if (alias === 'alice') {
              return {
                entityId: '0.0.200000',
                keyRefId: 'alice-key-ref-id',
                publicKey: 'alice-pub-key',
              };
            }
            return null;
          }),
        },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: '0' }),
        },
      });

      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          to: ['alice'],
          amount: ['100'],
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger: makeLogger(),
      };

      const result = await tokenAirdropFt(args);

      const output = assertOutput(result.result, TokenAirdropFtOutputSchema);
      expect(output.recipients[0].to).toBe('0.0.200000');
    });

    test('should handle raw base units with "t" suffix without fetching decimals', async () => {
      const mirrorGetTokenInfo = jest.fn().mockResolvedValue({ decimals: '6' });

      const { api } = makeApiMocks({
        tokens: {
          createAirdropFtTransaction: jest
            .fn()
            .mockReturnValue(mockAirdropTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(makeSuccessResult()),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
        mirror: { getTokenInfo: mirrorGetTokenInfo },
      });

      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          to: ['0.0.789012'],
          amount: ['500t'],
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger: makeLogger(),
      };

      const result = await tokenAirdropFt(args);

      const output = assertOutput(result.result, TokenAirdropFtOutputSchema);
      expect(output.recipients[0].amount).toBe(500n);
      expect(mirrorGetTokenInfo).not.toHaveBeenCalled();
    });

    test('should resolve token alias to token ID', async () => {
      const { api, tokens } = makeApiMocks({
        tokens: {
          createAirdropFtTransaction: jest
            .fn()
            .mockReturnValue(mockAirdropTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(makeSuccessResult()),
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias) => {
            if (alias === 'my-token') {
              return { entityId: '0.0.12345' };
            }
            return null;
          }),
        },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: '0' }),
        },
      });

      const args: CommandHandlerArgs = {
        args: {
          token: 'my-token',
          to: ['0.0.789012'],
          amount: ['100'],
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger: makeLogger(),
      };

      const result = await tokenAirdropFt(args);

      const output = assertOutput(result.result, TokenAirdropFtOutputSchema);
      expect(output.tokenId).toBe('0.0.12345');
      expect(tokens.createAirdropFtTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ tokenId: '0.0.12345' }),
      );
    });
  });

  describe('validation scenarios', () => {
    test('should throw when --to and --amount arrays have different lengths', async () => {
      const { api } = makeApiMocks();

      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          to: ['0.0.100001', '0.0.100002'],
          amount: ['100'],
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger: makeLogger(),
      };

      await expect(tokenAirdropFt(args)).rejects.toThrow(
        'Number of --to flags (2) must match number of --amount flags (1)',
      );
    });

    test('should throw ValidationError when recipients exceed limit of 9', async () => {
      const { api } = makeApiMocks({
        alias: { resolve: jest.fn().mockReturnValue(null) },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: '0' }),
        },
      });

      const recipients = Array.from(
        { length: 10 },
        (_, i) => `0.0.${100000 + i}`,
      );
      const amounts = Array.from({ length: 10 }, () => '100t');

      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          to: recipients,
          amount: amounts,
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger: makeLogger(),
      };

      await expect(tokenAirdropFt(args)).rejects.toThrow(ValidationError);
      await expect(tokenAirdropFt(args)).rejects.toThrow(
        'Too many recipients: 10. Maximum allowed is 9 per transaction.',
      );
    });
  });

  describe('error scenarios', () => {
    test('should throw NotFoundError when token is not found', async () => {
      const { api } = makeApiMocks({
        alias: { resolve: jest.fn().mockReturnValue(null) },
      });

      const args: CommandHandlerArgs = {
        args: {
          token: 'nonexistent-token',
          to: ['0.0.789012'],
          amount: ['100'],
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger: makeLogger(),
      };

      await expect(tokenAirdropFt(args)).rejects.toThrow(
        'Token "nonexistent-token" not found on testnet',
      );
    });

    test('should throw NotFoundError when destination account is not found', async () => {
      const { api } = makeApiMocks({
        alias: { resolve: jest.fn().mockReturnValue(null) },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: '0' }),
        },
      });

      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          to: ['nonexistent-alias'],
          amount: ['100t'],
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger: makeLogger(),
      };

      await expect(tokenAirdropFt(args)).rejects.toThrow(
        'Account "nonexistent-alias" not found on testnet',
      );
    });

    test('should throw TransactionError when transaction execution fails', async () => {
      const { api } = makeApiMocks({
        tokens: {
          createAirdropFtTransaction: jest
            .fn()
            .mockReturnValue(mockAirdropTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue({
            ...mockTransactionResults.failure,
            transactionId: '0.0.123@1234567890.000000000',
          }),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: '0' }),
        },
      });

      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          to: ['0.0.789012'],
          amount: ['100t'],
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger: makeLogger(),
      };

      await expect(tokenAirdropFt(args)).rejects.toThrow(TransactionError);
      await expect(tokenAirdropFt(args)).rejects.toThrow(
        'Fungible token airdrop failed',
      );
    });
  });
});

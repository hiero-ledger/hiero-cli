import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import '@/core/utils/json-serialize';

import { makeConfigMock, makeStateMock } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { TransactionError } from '@/core/errors';
import {
  tokenCancelAirdrop,
  TokenCancelAirdropOutputSchema,
} from '@/plugins/token/commands/cancel-airdrop';

import { mockTransactionResults } from './helpers/fixtures';
import { makeApiMocks, makeLogger } from './helpers/mocks';

describe('tokenCancelAirdrop', () => {
  const mockCancelTransaction = { test: 'cancel-airdrop-transaction' };

  const makeSuccessResult = (overrides = {}) => ({
    ...mockTransactionResults.success,
    transactionId: '0.0.123@1234567890.123456789',
    consensusTimestamp: '1234567890.123456789',
    ...overrides,
  });

  describe('success scenarios', () => {
    test('should cancel FT airdrop using account-id:private-key format', async () => {
      const { api, tokens } = makeApiMocks({
        tokens: {
          createCancelAirdropTransaction: jest
            .fn()
            .mockReturnValue(mockCancelTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(makeSuccessResult()),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'imported-key-ref-id',
            publicKey: 'imported-public-key',
          }),
        },
      });

      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.300',
          receiver: '0.0.200',
          from: '0.0.100:2222222222222222222222222222222222222222222222222222222222222222',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger: makeLogger(),
      };

      const result = await tokenCancelAirdrop(args);

      const output = assertOutput(
        result.result,
        TokenCancelAirdropOutputSchema,
      );
      expect(output.tokenId).toBe('0.0.300');
      expect(output.sender).toBe('0.0.100');
      expect(output.receiver).toBe('0.0.200');
      expect(output.serial).toBeNull();
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');

      expect(tokens.createCancelAirdropTransaction).toHaveBeenCalledWith({
        tokenId: '0.0.300',
        senderAccountId: '0.0.100',
        receiverAccountId: '0.0.200',
      });
    });

    test('should cancel NFT airdrop when --serial is provided', async () => {
      const { api, tokens } = makeApiMocks({
        tokens: {
          createCancelAirdropTransaction: jest
            .fn()
            .mockReturnValue(mockCancelTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(makeSuccessResult()),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'imported-key-ref-id',
            publicKey: 'imported-public-key',
          }),
        },
      });

      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.300',
          receiver: '0.0.200',
          serial: 42,
          from: '0.0.100:2222222222222222222222222222222222222222222222222222222222222222',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger: makeLogger(),
      };

      const result = await tokenCancelAirdrop(args);

      const output = assertOutput(
        result.result,
        TokenCancelAirdropOutputSchema,
      );
      expect(output.serial).toBe(42);

      expect(tokens.createCancelAirdropTransaction).toHaveBeenCalledWith({
        tokenId: '0.0.300',
        senderAccountId: '0.0.100',
        receiverAccountId: '0.0.200',
        serial: 42,
      });
    });

    test('should use operator as sender when --from is not provided', async () => {
      const { api, tokens } = makeApiMocks({
        tokens: {
          createCancelAirdropTransaction: jest
            .fn()
            .mockReturnValue(mockCancelTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(makeSuccessResult()),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
      });

      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.300',
          receiver: '0.0.200',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger: makeLogger(),
      };

      const result = await tokenCancelAirdrop(args);

      const output = assertOutput(
        result.result,
        TokenCancelAirdropOutputSchema,
      );
      expect(output.sender).toBe('0.0.100000'); // operator account from mock
      expect(tokens.createCancelAirdropTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ senderAccountId: '0.0.100000' }),
      );
    });

    test('should resolve token alias to token ID', async () => {
      const { api, tokens } = makeApiMocks({
        tokens: {
          createCancelAirdropTransaction: jest
            .fn()
            .mockReturnValue(mockCancelTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(makeSuccessResult()),
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias) => {
            if (alias === 'my-token') return { entityId: '0.0.12345' };
            return null;
          }),
        },
      });

      const args: CommandHandlerArgs = {
        args: {
          token: 'my-token',
          receiver: '0.0.200',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger: makeLogger(),
      };

      const result = await tokenCancelAirdrop(args);

      const output = assertOutput(
        result.result,
        TokenCancelAirdropOutputSchema,
      );
      expect(output.tokenId).toBe('0.0.12345');
      expect(tokens.createCancelAirdropTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ tokenId: '0.0.12345' }),
      );
    });

    test('should resolve receiver alias to account ID', async () => {
      const { api } = makeApiMocks({
        tokens: {
          createCancelAirdropTransaction: jest
            .fn()
            .mockReturnValue(mockCancelTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(makeSuccessResult()),
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias) => {
            if (alias === 'alice') {
              return { entityId: '0.0.200000', publicKey: 'pk', keyRefId: 'k' };
            }
            return null;
          }),
        },
      });

      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.300',
          receiver: 'alice',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger: makeLogger(),
      };

      const result = await tokenCancelAirdrop(args);

      const output = assertOutput(
        result.result,
        TokenCancelAirdropOutputSchema,
      );
      expect(output.receiver).toBe('0.0.200000');
    });
  });

  describe('error scenarios', () => {
    test('should throw when token is not resolvable', async () => {
      const { api } = makeApiMocks({
        alias: { resolve: jest.fn().mockReturnValue(null) },
      });

      const args: CommandHandlerArgs = {
        args: {
          token: 'nonexistent-token',
          receiver: '0.0.200',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger: makeLogger(),
      };

      await expect(tokenCancelAirdrop(args)).rejects.toThrow(
        'Token "nonexistent-token" not found on testnet',
      );
    });

    test('should throw when receiver is not resolvable', async () => {
      const { api } = makeApiMocks({
        alias: { resolve: jest.fn().mockReturnValue(null) },
      });

      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.300',
          receiver: 'nonexistent-alias',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger: makeLogger(),
      };

      await expect(tokenCancelAirdrop(args)).rejects.toThrow(
        'Account "nonexistent-alias" not found on testnet',
      );
    });

    test('should throw TransactionError when transaction execution fails', async () => {
      const { api } = makeApiMocks({
        tokens: {
          createCancelAirdropTransaction: jest
            .fn()
            .mockReturnValue(mockCancelTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue({
            ...mockTransactionResults.failure,
            transactionId: '0.0.123@1234567890.000000000',
          }),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
      });

      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.300',
          receiver: '0.0.200',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger: makeLogger(),
      };

      await expect(tokenCancelAirdrop(args)).rejects.toThrow(TransactionError);
      await expect(tokenCancelAirdrop(args)).rejects.toThrow(
        'Cancel airdrop failed',
      );
    });
  });
});

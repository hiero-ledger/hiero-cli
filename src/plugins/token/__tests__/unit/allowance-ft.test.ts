import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import '@/core/utils/json-serialize';

import { makeConfigMock, makeStateMock } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { NetworkError } from '@/core';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { KeyAlgorithm } from '@/core/shared/constants';
import {
  tokenAllowanceFt,
  TokenAllowanceFtOutputSchema,
} from '@/plugins/token/commands/allowance-ft';

import { mockTransactionResults } from './helpers/fixtures';
import { makeApiMocks, makeLogger } from './helpers/mocks';

const OWNER_PRIVATE_KEY =
  '2222222222222222222222222222222222222222222222222222222222222222';
const OWNER_ACCOUNT = `0.0.345678:${OWNER_PRIVATE_KEY}`;

describe('tokenAllowanceFt', () => {
  describe('success scenarios', () => {
    test('should approve allowance using account-id:private-key format', async () => {
      const mockAllowanceTx = { test: 'allowance-transaction' };
      const mockResult = {
        ...mockTransactionResults.success,
        transactionId: '0.0.123@1234567890.123456789',
        consensusTimestamp: '1234567890.123456789',
      };

      const { api, tokens, txExecute, kms } = makeApiMocks({
        tokens: {
          createFungibleTokenAllowanceTransaction: jest
            .fn()
            .mockReturnValue(mockAllowanceTx),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(mockResult),
        },
        alias: {
          resolve: jest.fn().mockReturnValue(null),
        },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: 6 }),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'imported-key-ref-id',
            publicKey: 'imported-public-key',
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.999999',
          owner: OWNER_ACCOUNT,
          spender: '0.0.111111',
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      const result = await tokenAllowanceFt(args);

      const output = assertOutput(result.result, TokenAllowanceFtOutputSchema);
      expect(output.tokenId).toBe('0.0.999999');
      expect(output.ownerAccountId).toBe('0.0.345678');
      expect(output.spenderAccountId).toBe('0.0.111111');
      expect(output.amount).toBe(100000000n);
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');

      expect(
        tokens.createFungibleTokenAllowanceTransaction,
      ).toHaveBeenCalledWith({
        tokenId: '0.0.999999',
        ownerAccountId: '0.0.345678',
        spenderAccountId: '0.0.111111',
        amount: 100000000n,
      });
      expect(txExecute.execute).toHaveBeenCalledWith(expect.anything());
      expect(kms.importPrivateKey).toHaveBeenCalledWith(
        KeyAlgorithm.ECDSA,
        OWNER_PRIVATE_KEY,
        'local',
        ['token:owner'],
      );
    });

    test('should approve allowance with raw base units (t suffix)', async () => {
      const mockAllowanceTx = { test: 'allowance-transaction' };
      const mockResult = {
        ...mockTransactionResults.success,
        transactionId: '0.0.123@1234567890.123456789',
        consensusTimestamp: '1234567890.123456789',
      };

      const { api, tokens } = makeApiMocks({
        tokens: {
          createFungibleTokenAllowanceTransaction: jest
            .fn()
            .mockReturnValue(mockAllowanceTx),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(mockResult),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'imported-key-ref-id',
            publicKey: 'imported-public-key',
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.999999',
          owner: OWNER_ACCOUNT,
          spender: '0.0.111111',
          amount: '500t',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      const result = await tokenAllowanceFt(args);

      const output = assertOutput(result.result, TokenAllowanceFtOutputSchema);
      expect(output.amount).toBe(500n);
      expect(
        tokens.createFungibleTokenAllowanceTransaction,
      ).toHaveBeenCalledWith(expect.objectContaining({ amount: 500n }));
    });

    test('should revoke allowance when amount is 0', async () => {
      const mockAllowanceTx = { test: 'allowance-transaction' };
      const mockResult = {
        ...mockTransactionResults.success,
        transactionId: '0.0.123@1234567890.123456789',
        consensusTimestamp: '1234567890.123456789',
      };

      const { api, tokens } = makeApiMocks({
        tokens: {
          createFungibleTokenAllowanceTransaction: jest
            .fn()
            .mockReturnValue(mockAllowanceTx),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(mockResult),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'imported-key-ref-id',
            publicKey: 'imported-public-key',
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.999999',
          owner: OWNER_ACCOUNT,
          spender: '0.0.111111',
          amount: '0',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      const result = await tokenAllowanceFt(args);

      const output = assertOutput(result.result, TokenAllowanceFtOutputSchema);
      expect(output.amount).toBe(0n);
      expect(
        tokens.createFungibleTokenAllowanceTransaction,
      ).toHaveBeenCalledWith(expect.objectContaining({ amount: 0n }));
    });

    test('should resolve spender from alias', async () => {
      const mockAllowanceTx = { test: 'allowance-transaction' };
      const mockResult = {
        ...mockTransactionResults.success,
        transactionId: '0.0.123@1234567890.123456789',
        consensusTimestamp: '1234567890.123456789',
      };

      const { api, alias } = makeApiMocks({
        tokens: {
          createFungibleTokenAllowanceTransaction: jest
            .fn()
            .mockReturnValue(mockAllowanceTx),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(mockResult),
        },
        alias: {
          resolve: jest.fn().mockImplementation((name, type) => {
            if (type === AliasType.Account && name === 'spender-alias') {
              return { entityId: '0.0.111111' };
            }
            return null;
          }),
        },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: 6 }),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'imported-key-ref-id',
            publicKey: 'imported-public-key',
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.999999',
          owner: OWNER_ACCOUNT,
          spender: 'spender-alias',
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      const result = await tokenAllowanceFt(args);

      const output = assertOutput(result.result, TokenAllowanceFtOutputSchema);
      expect(output.spenderAccountId).toBe('0.0.111111');
      expect(alias.resolve).toHaveBeenCalledWith(
        'spender-alias',
        AliasType.Account,
        'testnet',
      );
    });
  });

  describe('error scenarios', () => {
    test('should throw when transaction fails', async () => {
      const mockAllowanceTx = { test: 'allowance-transaction' };

      const { api } = makeApiMocks({
        tokens: {
          createFungibleTokenAllowanceTransaction: jest
            .fn()
            .mockReturnValue(mockAllowanceTx),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(mockTransactionResults.failure),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: 6 }),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'imported-key-ref-id',
            publicKey: 'imported-public-key',
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.999999',
          owner: OWNER_ACCOUNT,
          spender: '0.0.111111',
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      await expect(tokenAllowanceFt(args)).rejects.toThrow();
    });

    test('should throw when token service throws', async () => {
      const { api } = makeApiMocks({
        tokens: {
          createFungibleTokenAllowanceTransaction: jest
            .fn()
            .mockImplementation(() => {
              throw new NetworkError('Network error');
            }),
        },
        alias: { resolve: jest.fn().mockReturnValue(null) },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: 6 }),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'imported-key-ref-id',
            publicKey: 'imported-public-key',
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.999999',
          owner: OWNER_ACCOUNT,
          spender: '0.0.111111',
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      await expect(tokenAllowanceFt(args)).rejects.toThrow('Network error');
    });
  });
});

import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import '@/core/utils/json-serialize';

import {
  ECDSA_HEX_PRIVATE_KEY,
  MOCK_ACCOUNT_ID,
  MOCK_ACCOUNT_ID_ALT,
  MOCK_HEDERA_ENTITY_ID_1,
} from '@/__tests__/mocks/fixtures';
import { makeConfigMock, makeStateMock } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { NetworkError } from '@/core';
import { FtAllowanceEntry } from '@/core/services/allowance';
import { KeyAlgorithm } from '@/core/shared/constants';
import { AliasType } from '@/core/types/shared.types';
import {
  tokenAllowanceFt,
  TokenAllowanceFtOutputSchema,
} from '@/plugins/token/commands/allowance-ft';

import { mockTransactionResults } from './helpers/fixtures';
import { makeApiMocks, makeLogger } from './helpers/mocks';

const TOKEN_ID = MOCK_HEDERA_ENTITY_ID_1;
const OWNER_ACCOUNT_ID = MOCK_ACCOUNT_ID;
const SPENDER_ACCOUNT_ID = MOCK_ACCOUNT_ID_ALT;
const OWNER_ACCOUNT = `${OWNER_ACCOUNT_ID}:${ECDSA_HEX_PRIVATE_KEY}`;

describe('tokenAllowanceFt', () => {
  describe('success scenarios', () => {
    test('should approve allowance using account-id:private-key format', async () => {
      const mockAllowanceTx = { test: 'allowance-transaction' };
      const mockResult = {
        ...mockTransactionResults.success,
        transactionId: '0.0.123@1234567890.123456789',
        consensusTimestamp: '1234567890.123456789',
      };

      const { api, allowance, txExecute, kms } = makeApiMocks({
        allowance: {
          buildAllowanceApprove: jest.fn().mockReturnValue(mockAllowanceTx),
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
          token: TOKEN_ID,
          owner: OWNER_ACCOUNT,
          spender: SPENDER_ACCOUNT_ID,
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      const result = await tokenAllowanceFt(args);

      const output = assertOutput(result.result, TokenAllowanceFtOutputSchema);
      expect(output.tokenId).toBe(TOKEN_ID);
      expect(output.ownerAccountId).toBe(OWNER_ACCOUNT_ID);
      expect(output.spenderAccountId).toBe(SPENDER_ACCOUNT_ID);
      expect(output.amount).toBe(100000000n);
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');

      expect(allowance.buildAllowanceApprove).toHaveBeenCalledWith([
        new FtAllowanceEntry(
          OWNER_ACCOUNT_ID,
          SPENDER_ACCOUNT_ID,
          TOKEN_ID,
          100000000n,
        ),
      ]);
      expect(txExecute.execute).toHaveBeenCalledWith(expect.anything());
      expect(kms.importPrivateKey).toHaveBeenCalledWith(
        KeyAlgorithm.ECDSA,
        ECDSA_HEX_PRIVATE_KEY,
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

      const { api, allowance } = makeApiMocks({
        allowance: {
          buildAllowanceApprove: jest.fn().mockReturnValue(mockAllowanceTx),
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
          token: TOKEN_ID,
          owner: OWNER_ACCOUNT,
          spender: SPENDER_ACCOUNT_ID,
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
      expect(allowance.buildAllowanceApprove).toHaveBeenCalledWith([
        new FtAllowanceEntry(
          OWNER_ACCOUNT_ID,
          SPENDER_ACCOUNT_ID,
          TOKEN_ID,
          500n,
        ),
      ]);
    });

    test('should revoke allowance when amount is 0', async () => {
      const mockAllowanceTx = { test: 'allowance-transaction' };
      const mockResult = {
        ...mockTransactionResults.success,
        transactionId: '0.0.123@1234567890.123456789',
        consensusTimestamp: '1234567890.123456789',
      };

      const { api, allowance } = makeApiMocks({
        allowance: {
          buildAllowanceApprove: jest.fn().mockReturnValue(mockAllowanceTx),
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
          token: TOKEN_ID,
          owner: OWNER_ACCOUNT,
          spender: SPENDER_ACCOUNT_ID,
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
      expect(allowance.buildAllowanceApprove).toHaveBeenCalledWith([
        new FtAllowanceEntry(
          OWNER_ACCOUNT_ID,
          SPENDER_ACCOUNT_ID,
          TOKEN_ID,
          0n,
        ),
      ]);
    });

    test('should resolve spender from alias', async () => {
      const mockAllowanceTx = { test: 'allowance-transaction' };
      const mockResult = {
        ...mockTransactionResults.success,
        transactionId: '0.0.123@1234567890.123456789',
        consensusTimestamp: '1234567890.123456789',
      };

      const { api, alias } = makeApiMocks({
        allowance: {
          buildAllowanceApprove: jest.fn().mockReturnValue(mockAllowanceTx),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(mockResult),
        },
        alias: {
          resolve: jest.fn().mockImplementation((name, type) => {
            if (type === AliasType.Account && name === 'spender-alias') {
              return { entityId: SPENDER_ACCOUNT_ID };
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
          token: TOKEN_ID,
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
      expect(output.spenderAccountId).toBe(SPENDER_ACCOUNT_ID);
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
        allowance: {
          buildAllowanceApprove: jest.fn().mockReturnValue(mockAllowanceTx),
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
          token: TOKEN_ID,
          owner: OWNER_ACCOUNT,
          spender: SPENDER_ACCOUNT_ID,
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      await expect(tokenAllowanceFt(args)).rejects.toThrow();
    });

    test('should throw when allowance service throws', async () => {
      const { api } = makeApiMocks({
        allowance: {
          buildAllowanceApprove: jest.fn().mockImplementation(() => {
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
          token: TOKEN_ID,
          owner: OWNER_ACCOUNT,
          spender: SPENDER_ACCOUNT_ID,
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

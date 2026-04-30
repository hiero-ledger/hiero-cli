import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import { assertOutput } from '@/__tests__/utils/assert-output';
import { SupportedNetwork } from '@/core';
import {
  InternalError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { KeyAlgorithm } from '@/core/shared/constants';
import { AliasType } from '@/core/types/shared.types';
import {
  tokenAssociate,
  TokenAssociateOutputSchema,
} from '@/plugins/token/commands/associate';

import {
  makeApiMocks,
  makeLogger,
  makeTransactionResult,
} from './helpers/mocks';

describe('tokenAssociateHandler', () => {
  describe('success scenarios', () => {
    test('should associate token with account using account-id:account-key format', async () => {
      const mockAssociationTransaction = { test: 'association-transaction' };
      const mockSignResult = makeTransactionResult();

      const { api, tokenTransactions, txExecute, kms } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(mockSignResult),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'imported-key-ref-id',
            publicKey: 'imported-public-key',
          }),
        },
        mirror: {
          getAccountTokenBalances: jest.fn().mockResolvedValue({
            tokens: [],
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          account:
            '0.0.789012:3333333333333333333333333333333333333333333333333333333333333333',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenAssociate(args);

      const output = assertOutput(result.result, TokenAssociateOutputSchema);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.accountId).toBe('0.0.789012');
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');

      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        accountId: '0.0.789012',
      });
      expect(txExecute.execute).toHaveBeenCalledWith(expect.anything());
      expect(kms.importPrivateKey).toHaveBeenCalledWith(
        KeyAlgorithm.ECDSA,
        '3333333333333333333333333333333333333333333333333333333333333333',
        'local',
        ['token:associate'],
      );
    });

    test('should associate token with account using alias', async () => {
      const mockAssociationTransaction = { test: 'association-transaction' };
      const mockSignResult = makeTransactionResult();

      const { api, tokenTransactions, txExecute, alias } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(mockSignResult),
        },
        alias: {
          resolve: jest.fn().mockReturnValue({
            entityId: '0.0.789012',
            publicKey: '302a300506032b6570032100' + '0'.repeat(64),
            keyRefId: 'alias-key-ref-id',
          }),
        },
        mirror: {
          getAccountTokenBalances: jest.fn().mockResolvedValue({
            tokens: [],
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          account: 'alice',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenAssociate(args);

      const output = assertOutput(result.result, TokenAssociateOutputSchema);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.accountId).toBe('0.0.789012');
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');

      expect(alias.resolve).toHaveBeenCalledWith(
        'alice',
        AliasType.Account,
        SupportedNetwork.TESTNET,
      );
      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        accountId: '0.0.789012',
      });
      expect(txExecute.execute).toHaveBeenCalledWith(expect.anything());
    });
  });

  describe('error scenarios', () => {
    test('should throw ValidationError when token is already associated', async () => {
      const tokenId = '0.0.123456';
      const accountId = '0.0.789012';

      const { api } = makeApiMocks({
        alias: {
          resolve: jest.fn().mockReturnValue({ entityId: tokenId }),
        },
        mirror: {
          getAccountTokenBalances: jest.fn().mockResolvedValue({
            tokens: [{ token_id: tokenId, balance: 0 }],
          }),
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
          token: tokenId,
          account: `${accountId}:3333333333333333333333333333333333333333333333333333333333333333`,
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenAssociate(args)).rejects.toThrow(ValidationError);
    });

    test('should not call transaction pipeline when token is already associated', async () => {
      const tokenId = '0.0.123456';
      const accountId = '0.0.789012';

      const createTokenAssociationTransaction = jest.fn();
      const txSignSign = jest.fn();
      const txExecuteExecute = jest.fn();

      const { api } = makeApiMocks({
        mirror: {
          getAccountTokenBalances: jest.fn().mockResolvedValue({
            tokens: [{ token_id: tokenId, balance: 0 }],
          }),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'imported-key-ref-id',
            publicKey: 'imported-public-key',
          }),
        },
        tokenTransactions: { createTokenAssociationTransaction },
        txSign: { sign: txSignSign },
        txExecute: { execute: txExecuteExecute },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: tokenId,
          account: `${accountId}:3333333333333333333333333333333333333333333333333333333333333333`,
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenAssociate(args)).rejects.toThrow(ValidationError);
      expect(createTokenAssociationTransaction).not.toHaveBeenCalled();
      expect(txSignSign).not.toHaveBeenCalled();
      expect(txExecuteExecute).not.toHaveBeenCalled();
    });

    test('should handle transaction failure', async () => {
      const mockAssociationTransaction = { test: 'association-transaction' };
      const mockSignResult = makeTransactionResult({
        success: false,
        transactionId: '',
      });

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(mockSignResult),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'imported-key-ref-id',
            publicKey: 'imported-public-key',
          }),
        },
        mirror: {
          getAccountTokenBalances: jest.fn().mockResolvedValue({
            tokens: [],
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          account:
            '0.0.789012:3333333333333333333333333333333333333333333333333333333333333333',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenAssociate(args)).rejects.toThrow(TransactionError);
    });

    test('should handle token transaction service error', async () => {
      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockImplementation(() => {
              throw new InternalError('Service unavailable');
            }),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'imported-key-ref-id',
            publicKey: 'imported-public-key',
          }),
        },
        mirror: {
          getAccountTokenBalances: jest.fn().mockResolvedValue({
            tokens: [],
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          account:
            '0.0.789012:3333333333333333333333333333333333333333333333333333333333333333',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenAssociate(args)).rejects.toThrow('Service unavailable');
    });

    test('should handle signing service error', async () => {
      const mockAssociationTransaction = { test: 'association-transaction' };

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        txExecute: {
          execute: jest.fn().mockRejectedValue(new Error('Signing failed')),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'imported-key-ref-id',
            publicKey: 'imported-public-key',
          }),
        },
        mirror: {
          getAccountTokenBalances: jest.fn().mockResolvedValue({
            tokens: [],
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          account:
            '0.0.789012:3333333333333333333333333333333333333333333333333333333333333333',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenAssociate(args)).rejects.toThrow('Signing failed');
    });
  });
});

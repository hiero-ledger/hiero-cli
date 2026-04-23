import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import { assertOutput } from '@/__tests__/utils/assert-output';
import {
  InternalError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { KeyAlgorithm } from '@/core/shared/constants';
import {
  tokenDissociate,
  TokenDissociateOutputSchema,
} from '@/plugins/token/commands/dissociate';

import {
  makeApiMocks,
  makeLogger,
  makeTransactionResult,
} from './helpers/mocks';

describe('tokenDissociateHandler', () => {
  describe('success scenarios', () => {
    test('should dissociate token from account when associated on mirror', async () => {
      const mockDissociationTransaction = { test: 'dissociation-transaction' };
      const mockSignResult = makeTransactionResult();

      const { api, tokenTransactions, txExecute, kms } = makeApiMocks({
        tokenTransactions: {
          createTokenDissociationTransaction: jest
            .fn()
            .mockReturnValue(mockDissociationTransaction),
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
            tokens: [{ token_id: '0.0.123456', balance: 0 }],
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

      const result = await tokenDissociate(args);

      const output = assertOutput(result.result, TokenDissociateOutputSchema);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.accountId).toBe('0.0.789012');
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');

      expect(
        tokenTransactions.createTokenDissociationTransaction,
      ).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        accountId: '0.0.789012',
      });
      expect(txExecute.execute).toHaveBeenCalledWith(expect.anything());
      expect(kms.importPrivateKey).toHaveBeenCalledWith(
        KeyAlgorithm.ECDSA,
        '3333333333333333333333333333333333333333333333333333333333333333',
        'local',
        ['token:dissociate'],
      );
    });
  });

  describe('error scenarios', () => {
    test('should throw ValidationError when token is not associated', async () => {
      const tokenId = '0.0.123456';
      const accountId = '0.0.789012';

      const { api } = makeApiMocks({
        alias: {
          resolve: jest.fn().mockReturnValue({ entityId: tokenId }),
        },
        mirror: {
          getAccountTokenBalances: jest.fn().mockResolvedValue({
            tokens: [],
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

      await expect(tokenDissociate(args)).rejects.toThrow(ValidationError);
    });

    test('should not call transaction pipeline when token is not associated', async () => {
      const tokenId = '0.0.123456';
      const accountId = '0.0.789012';

      const createTokenDissociationTransaction = jest.fn();
      const txSignSign = jest.fn();
      const txExecuteExecute = jest.fn();

      const { api } = makeApiMocks({
        mirror: {
          getAccountTokenBalances: jest.fn().mockResolvedValue({
            tokens: [],
          }),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'imported-key-ref-id',
            publicKey: 'imported-public-key',
          }),
        },
        tokenTransactions: { createTokenDissociationTransaction },
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

      await expect(tokenDissociate(args)).rejects.toThrow(ValidationError);
      expect(createTokenDissociationTransaction).not.toHaveBeenCalled();
      expect(txSignSign).not.toHaveBeenCalled();
      expect(txExecuteExecute).not.toHaveBeenCalled();
    });

    test('should handle transaction failure', async () => {
      const mockDissociationTransaction = { test: 'dissociation-transaction' };
      const mockSignResult = makeTransactionResult({
        success: false,
        transactionId: '',
      });

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenDissociationTransaction: jest
            .fn()
            .mockReturnValue(mockDissociationTransaction),
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
            tokens: [{ token_id: '0.0.123456', balance: 0 }],
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

      await expect(tokenDissociate(args)).rejects.toThrow(TransactionError);
    });

    test('should handle token transaction service error', async () => {
      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenDissociationTransaction: jest
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
            tokens: [{ token_id: '0.0.123456', balance: 0 }],
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

      await expect(tokenDissociate(args)).rejects.toThrow(
        'Service unavailable',
      );
    });
  });
});

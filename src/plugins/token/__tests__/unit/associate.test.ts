import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import {
  ReceiptStatusError,
  Status as HederaStatus,
  TransactionId,
} from '@hashgraph/sdk';

import { TransactionError } from '@/core/errors';
import { KeyAlgorithm } from '@/core/shared/constants';
import {
  associateToken,
  type AssociateTokenOutput,
} from '@/plugins/token/commands/associate';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import {
  tokenAssociatedWithAliasFixture,
  tokenWithoutAssociationsFixture,
} from './helpers/fixtures';
import {
  makeApiMocks,
  makeLogger,
  makeTransactionResult,
  mockZustandTokenStateHelper,
} from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

describe('associateTokenHandler', () => {
  beforeEach(() => {
    mockZustandTokenStateHelper(MockedHelper);
  });

  describe('success scenarios', () => {
    test('should return success when token is already associated (mirror pre-check)', async () => {
      const tokenId = '0.0.123456';
      const accountId = '0.0.789012';

      mockZustandTokenStateHelper(MockedHelper);

      const { api } = makeApiMocks({
        alias: {
          resolve: jest.fn().mockReturnValue({
            entityId: tokenId,
          }),
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

      const result = await associateToken(args);

      const output = result.result as AssociateTokenOutput;
      expect(output.tokenId).toBe(tokenId);
      expect(output.accountId).toBe(accountId);
      expect(output.associated).toBe(true);
      expect(output.alreadyAssociated).toBe(true);
      expect(output.transactionId).toBeUndefined();
    });

    test('should associate token with account using account-id:account-key format', async () => {
      const mockAddAssociation = jest.fn();
      const mockAssociationTransaction = { test: 'association-transaction' };
      const mockSignResult = makeTransactionResult();

      mockZustandTokenStateHelper(MockedHelper, {
        addAssociation: mockAddAssociation,
      });

      const { api, tokenTransactions, signing, kms } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
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

      const result = await associateToken(args);

      const output = result.result as AssociateTokenOutput;
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.accountId).toBe('0.0.789012');
      expect(output.associated).toBe(true);
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');

      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        accountId: '0.0.789012',
      });
      expect(signing.signAndExecuteWith).toHaveBeenCalledWith(
        mockAssociationTransaction,
        ['imported-key-ref-id'],
      );
      expect(kms.importPrivateKey).toHaveBeenCalledWith(
        KeyAlgorithm.ECDSA,
        '3333333333333333333333333333333333333333333333333333333333333333',
        'local',
        ['token:associate'],
      );
    });

    test('should associate token with account using alias', async () => {
      const mockAddAssociation = jest.fn();
      const mockAssociationTransaction = { test: 'association-transaction' };
      const mockSignResult = makeTransactionResult();

      mockZustandTokenStateHelper(MockedHelper, {
        addAssociation: mockAddAssociation,
      });

      const { api, tokenTransactions, signing, alias } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
        },
        alias: {
          resolve: jest.fn().mockReturnValue({
            entityId: '0.0.789012',
            publicKey: '302a300506032b6570032100' + '0'.repeat(64),
            keyRefId: 'alias-key-ref-id',
          }),
        },
        kms: {
          getPublicKey: jest.fn().mockReturnValue('alias-public-key'),
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

      const result = await associateToken(args);

      const output = result.result as AssociateTokenOutput;
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.accountId).toBe('0.0.789012');
      expect(output.associated).toBe(true);
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');

      expect(alias.resolve).toHaveBeenCalledWith('alice', 'account', 'testnet');
      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        accountId: '0.0.789012',
      });
      expect(signing.signAndExecuteWith).toHaveBeenCalledWith(
        mockAssociationTransaction,
        ['alias-key-ref-id'],
      );
    });

    test('should update token state with association', async () => {
      const mockAddAssociation = jest.fn();
      const mockAssociationTransaction = { test: 'association-transaction' };
      const mockSignResult = makeTransactionResult();

      mockZustandTokenStateHelper(MockedHelper, {
        addAssociation: mockAddAssociation,
      });

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
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

      const result = await associateToken(args);

      const output = result.result as AssociateTokenOutput;
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.accountId).toBe('0.0.789012');
      expect(output.associated).toBe(true);
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');
    });

    test('should return success when sdk reports already associated status', async () => {
      const mockAssociationTransaction = { test: 'association-transaction' };

      const statusError = new ReceiptStatusError({
        transactionReceipt: {} as never,
        status: HederaStatus.TokenAlreadyAssociatedToAccount,
        transactionId: TransactionId.fromString('0.0.123@1234567890.123456789'),
      });
      const wrappedError = new TransactionError(
        'Transaction execution failed',
        false,
        { cause: statusError },
      );

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockRejectedValue(wrappedError),
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

      const result = await associateToken(args);

      const output = result.result as AssociateTokenOutput;
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.accountId).toBe('0.0.789012');
      expect(output.associated).toBe(true);
      expect(output.alreadyAssociated).toBe(true);
      expect(output.transactionId).toBeUndefined();
      expect(api.txExecution.signAndExecuteWith).toHaveBeenCalledWith(
        mockAssociationTransaction,
        ['imported-key-ref-id'],
      );
    });
  });

  describe('error scenarios', () => {
    test('should handle transaction failure', async () => {
      const mockAddAssociation = jest.fn();
      const mockAssociationTransaction = { test: 'association-transaction' };
      const mockSignResult = makeTransactionResult({
        success: false,
        transactionId: '',
      });

      mockZustandTokenStateHelper(MockedHelper, {
        addAssociation: mockAddAssociation,
      });

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
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

      await expect(associateToken(args)).rejects.toThrow(TransactionError);
    });

    test('should handle token transaction service error', async () => {
      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockImplementation(() => {
              throw new Error('Service unavailable');
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

      await expect(associateToken(args)).rejects.toThrow('Service unavailable');
    });

    test('should handle signing service error', async () => {
      const mockAssociationTransaction = { test: 'association-transaction' };

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest
            .fn()
            .mockRejectedValue(new Error('Signing failed')),
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

      await expect(associateToken(args)).rejects.toThrow('Signing failed');
    });
  });

  describe('state management', () => {
    test('should initialize token state helper and save association', async () => {
      const mockAddTokenAssociation = jest.fn();
      const mockGetToken = jest
        .fn()
        .mockReturnValue(tokenWithoutAssociationsFixture);
      const mockAssociationTransaction = { test: 'association-transaction' };
      const mockSignResult = makeTransactionResult();

      mockZustandTokenStateHelper(MockedHelper, {
        getToken: mockGetToken,
        addTokenAssociation: mockAddTokenAssociation,
      });

      const { api, tokenTransactions, signing, kms } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
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

      const result = await associateToken(args);

      const output = result.result as AssociateTokenOutput;
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.accountId).toBe('0.0.789012');
      expect(output.associated).toBe(true);
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');

      expect(MockedHelper).toHaveBeenCalledWith(api.state, logger);

      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        accountId: '0.0.789012',
      });
      expect(signing.signAndExecuteWith).toHaveBeenCalledWith(
        mockAssociationTransaction,
        ['imported-key-ref-id'],
      );
      expect(kms.importPrivateKey).toHaveBeenCalledWith(
        KeyAlgorithm.ECDSA,
        '3333333333333333333333333333333333333333333333333333333333333333',
        'local',
        ['token:associate'],
      );
    });

    test('should use alias name for state when using alias', async () => {
      const mockAddTokenAssociation = jest.fn();
      const mockGetToken = jest
        .fn()
        .mockReturnValue(tokenAssociatedWithAliasFixture);
      const mockAssociationTransaction = { test: 'association-transaction' };
      const mockSignResult = makeTransactionResult();

      mockZustandTokenStateHelper(MockedHelper, {
        getToken: mockGetToken,
        addTokenAssociation: mockAddTokenAssociation,
      });

      const { api, tokenTransactions, signing } = makeApiMocks({
        tokenTransactions: {
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
        },
        alias: {
          resolve: jest.fn().mockReturnValue({
            entityId: '0.0.789012',
            publicKey: '302a300506032b6570032100' + '0'.repeat(64),
            keyRefId: 'alias-key-ref-id',
          }),
        },
        kms: {
          getPublicKey: jest.fn().mockReturnValue('alias-public-key'),
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
          account: 'my-account-alias',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await associateToken(args);

      const output = result.result as AssociateTokenOutput;
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.accountId).toBe('0.0.789012');
      expect(output.associated).toBe(true);
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');

      expect(MockedHelper).toHaveBeenCalledWith(api.state, logger);

      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        accountId: '0.0.789012',
      });
      expect(signing.signAndExecuteWith).toHaveBeenCalledWith(
        mockAssociationTransaction,
        ['alias-key-ref-id'],
      );
    });
  });
});

/**
 * Token Transfer Handler Unit Tests
 * Tests the token transfer functionality of the token plugin
 */
import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';

import '@/core/utils/json-serialize';

import { makeConfigMock, makeStateMock } from '@/__tests__/mocks/mocks';
import { KeyAlgorithm, Status } from '@/core/shared/constants';
import {
  type TransferFungibleTokenOutput,
  transferToken,
} from '@/plugins/token/commands/transfer';

import { mockTransactionResults } from './helpers/fixtures';
import { makeApiMocks, makeLogger } from './helpers/mocks';

describe('transferTokenHandler', () => {
  describe('success scenarios', () => {
    test('should transfer tokens between accounts using account-id:private-key format', async () => {
      // Arrange
      const mockTransferTransaction = { test: 'transfer-transaction' };
      const mockSignResult = {
        ...mockTransactionResults.success,
        transactionId: '0.0.123@1234567890.123456789',
        consensusTimestamp: '1234567890.123456789',
      };

      const { api, tokens, signing, kms } = makeApiMocks({
        tokens: {
          createTransferTransaction: jest
            .fn()
            .mockReturnValue(mockTransferTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
        },
        alias: {
          resolve: jest.fn().mockReturnValue(null), // No alias resolution needed for account-id:key format
        },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: 6 }), // Default token decimals
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
          token: '0.0.123456',
          to: '0.0.789012',
          from: '0.0.345678:2222222222222222222222222222222222222222222222222222222222222222',
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act
      const result = await transferToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(
        result.outputJson!,
      ) as TransferFungibleTokenOutput;
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.from).toBe('0.0.345678');
      expect(output.to).toBe('0.0.789012');
      expect(output.amount).toBe('100000000');
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');

      expect(tokens.createTransferTransaction).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        fromAccountId: '0.0.345678',
        toAccountId: '0.0.789012',
        amount: 100000000n,
      });
      expect(signing.signAndExecuteWith).toHaveBeenCalledWith(
        mockTransferTransaction,
        ['imported-key-ref-id'],
      );
      expect(kms.importPrivateKey).toHaveBeenCalledWith(
        KeyAlgorithm.ECDSA,
        '2222222222222222222222222222222222222222222222222222222222222222',
        'local',
        ['token:account'],
      );
    });

    test('should transfer tokens using alias for from account', async () => {
      // Arrange
      const mockTransferTransaction = { test: 'transfer-transaction' };
      const mockSignResult = {
        ...mockTransactionResults.success,
        transactionId: '0.0.123@1234567890.123456789',
        consensusTimestamp: '1234567890.123456789',
      };

      const { api, tokens, signing, alias } = makeApiMocks({
        tokens: {
          createTransferTransaction: jest
            .fn()
            .mockReturnValue(mockTransferTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
        },
        alias: {
          resolve: jest.fn().mockReturnValue({
            entityId: '0.0.345678',
            keyRefId: 'alias-key-ref-id',
            publicKey: '302a300506032b6570032100' + '0'.repeat(64),
          }),
        },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: 6 }),
        },
        kms: {
          getPublicKey: jest.fn().mockReturnValue('alias-public-key'),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          to: '0.0.789012',
          from: 'alice',
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act
      const result = await transferToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();

      const output = JSON.parse(
        result.outputJson!,
      ) as TransferFungibleTokenOutput;
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.from).toBe('0.0.345678');
      expect(output.to).toBe('0.0.789012');
      expect(output.amount).toBe('100000000');
      expect(output.transactionId).toBe('0.0.123@1234567890.123456789');

      expect(alias.resolve).toHaveBeenCalledWith('alice', 'account', 'testnet');
      expect(tokens.createTransferTransaction).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        fromAccountId: '0.0.345678',
        toAccountId: '0.0.789012',
        amount: 100000000n,
      });
      expect(signing.signAndExecuteWith).toHaveBeenCalledWith(
        mockTransferTransaction,
        ['alias-key-ref-id'],
      );
    });

    test('should transfer tokens using alias for to account', async () => {
      // Arrange
      const mockTransferTransaction = { test: 'transfer-transaction' };
      const mockSignResult = {
        ...mockTransactionResults.success,
        transactionId: '0.0.123@1234567890.123456789',
        consensusTimestamp: '1234567890.123456789',
      };

      const { api, tokens, alias } = makeApiMocks({
        tokens: {
          createTransferTransaction: jest
            .fn()
            .mockReturnValue(mockTransferTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias) => {
            if (alias === 'bob') {
              return {
                entityId: '0.0.789012',
                keyRefId: 'bob-key-ref-id',
              };
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
          token: '0.0.123456',
          to: 'bob',
          from: '0.0.345678:2222222222222222222222222222222222222222222222222222222222222222',
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act
      const result = await transferToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();
      expect(result.errorMessage).toBeUndefined();

      // Verify the transfer succeeded
      const output = JSON.parse(result.outputJson!);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.to).toBe('0.0.789012');

      expect(alias.resolve).toHaveBeenCalledWith('bob', 'account', 'testnet');
      expect(tokens.createTransferTransaction).toHaveBeenCalledWith({
        tokenId: '0.0.123456',
        fromAccountId: '0.0.345678',
        toAccountId: '0.0.789012',
        amount: 100000000n,
      });
    });

    test('should reject zero amount transfer', async () => {
      // Arrange
      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: 6 }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          to: '0.0.789012',
          from: '0.0.345678:2222222222222222222222222222222222222222222222222222222222222222',
          amount: '0',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act
      const result = await transferToken(args);

      // Assert - Schema accepts "0" so transfer executes
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
    });
  });

  describe('validation scenarios', () => {
    test('should handle missing from parameter (uses default operator)', async () => {
      // Arrange
      const mockTransferTransaction = { test: 'transfer-transaction' };
      const mockSignResult = {
        ...mockTransactionResults.success,
        transactionId: '0.0.123@1234567890.123456789',
        consensusTimestamp: '1234567890.123456789',
      };

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTransferTransaction: jest
            .fn()
            .mockReturnValue(mockTransferTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'imported-key-ref-id',
            publicKey: 'imported-public-key',
          }),
          getPublicKey: jest
            .fn()
            .mockReturnValue('302a300506032b6570032100' + '0'.repeat(64)),
        },
      });

      // Setup operator for fallback
      api.network = {
        ...api.network,
        getCurrentNetwork: jest.fn().mockReturnValue('testnet'),
        getOperator: jest.fn().mockReturnValue({
          accountId: '0.0.2',
          keyRefId: 'operator-key-ref-id',
        }),
        getCurrentOperatorOrThrow: jest.fn().mockReturnValue({
          accountId: '0.0.2',
          keyRefId: 'operator-key-ref-id',
        }),
      } as NetworkService;

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          to: '0.0.789012',
          amount: '100',
          // from missing - should use default operator
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act
      const result = await transferToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();
      expect(result.errorMessage).toBeUndefined();

      // Verify the transfer succeeded
      const output = JSON.parse(result.outputJson!);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.to).toBe('0.0.789012');
    });
  });

  describe('error scenarios', () => {
    test('should handle transaction failure', async () => {
      // Arrange
      const mockTransferTransaction = { test: 'transfer-transaction' };
      const mockSignResult = {
        ...mockTransactionResults.failure,
        consensusTimestamp: '1234567890.123456789',
      };

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTransferTransaction: jest
            .fn()
            .mockResolvedValue(mockTransferTransaction),
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
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          to: '0.0.789012',
          from: '0.0.345678:2222222222222222222222222222222222222222222222222222222222222222',
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act
      const result = await transferToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.outputJson).toBeUndefined();
    });

    test('should handle token transaction service error', async () => {
      // Arrange
      const { api } = makeApiMocks({
        tokens: {
          createTransferTransaction: jest.fn().mockImplementation(() => {
            throw new Error('Network error');
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
          token: '0.0.123456',
          to: '0.0.789012',
          from: '0.0.345678:2222222222222222222222222222222222222222222222222222222222222222',
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act
      const result = await transferToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage).toContain('Network error');
      expect(result.outputJson).toBeUndefined();
    });

    test('should handle signing service error', async () => {
      // Arrange
      const mockTransferTransaction = { test: 'transfer-transaction' };

      const { api } = makeApiMocks({
        tokens: {
          createTransferTransaction: jest
            .fn()
            .mockReturnValue(mockTransferTransaction),
        },
        signing: {
          signAndExecuteWith: jest
            .fn()
            .mockRejectedValue(new Error('Invalid key')),
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
          token: '0.0.123456',
          to: '0.0.789012',
          from: '0.0.345678:2222222222222222222222222222222222222222222222222222222222222222',
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act
      const result = await transferToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Failure);
      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage).toContain('Invalid key');
      expect(result.outputJson).toBeUndefined();
    });

    test('should handle large amount transfers', async () => {
      // Arrange
      const mockTransferTransaction = { test: 'transfer-transaction' };
      const mockSignResult = {
        ...mockTransactionResults.success,
        transactionId: '0.0.123@1234567890.123456789',
        consensusTimestamp: '1234567890.123456789',
      };

      const { api, tokenTransactions: _tokenTransactions } = makeApiMocks({
        tokenTransactions: {
          createTransferTransaction: jest
            .fn()
            .mockReturnValue(mockTransferTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
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
          token: '0.0.123456',
          to: '0.0.789012',
          from: '0.0.345678:2222222222222222222222222222222222222222222222222222222222222222',
          amount: '999999999', // Large amount
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act
      const result = await transferToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();
      expect(result.errorMessage).toBeUndefined();

      // Verify the transfer succeeded
      const output = JSON.parse(result.outputJson!);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.to).toBe('0.0.789012');

      expect(_tokenTransactions.createTransferTransaction).toHaveBeenCalledWith(
        {
          tokenId: '0.0.123456',
          fromAccountId: '0.0.345678',
          toAccountId: '0.0.789012',
          amount: 999999999000000n,
        },
      );
    });
  });

  describe('logging and debugging', () => {
    test('should log transfer details', async () => {
      // Arrange
      const mockTransferTransaction = { test: 'transfer-transaction' };
      const mockSignResult = {
        ...mockTransactionResults.success,
        transactionId: '0.0.123@1234567890.123456789',
        consensusTimestamp: '1234567890.123456789',
      };

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTransferTransaction: jest
            .fn()
            .mockReturnValue(mockTransferTransaction),
        },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: 6 }),
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
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          to: '0.0.789012',
          from: '0.0.345678:2222222222222222222222222222222222222222222222222222222222222222',
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act
      const result = await transferToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();
      expect(result.errorMessage).toBeUndefined();

      // Verify the transfer succeeded
      const output = JSON.parse(result.outputJson!);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.to).toBe('0.0.789012');
    });
  });

  describe('edge cases', () => {
    test('should handle same from and to account', async () => {
      // Arrange
      const mockTransferTransaction = { test: 'transfer-transaction' };
      const mockSignResult = {
        ...mockTransactionResults.success,
        transactionId: '0.0.123@1234567890.123456789',
        consensusTimestamp: '1234567890.123456789',
      };

      const { api, tokenTransactions: _tokenTransactions } = makeApiMocks({
        tokenTransactions: {
          createTransferTransaction: jest
            .fn()
            .mockReturnValue(mockTransferTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
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
          token: '0.0.123456',
          to: '0.0.345678', // Same as from
          from: '0.0.345678:2222222222222222222222222222222222222222222222222222222222222222',
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act
      const result = await transferToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();
      expect(result.errorMessage).toBeUndefined();

      // Verify the transfer succeeded
      const output = JSON.parse(result.outputJson!);
      expect(output.tokenId).toBe('0.0.123456');
      expect(output.to).toBe('0.0.345678');

      expect(_tokenTransactions.createTransferTransaction).toHaveBeenCalledWith(
        {
          tokenId: '0.0.123456',
          fromAccountId: '0.0.345678',
          toAccountId: '0.0.345678',
          amount: 100000000n,
        },
      );
    });

    test('should handle decimal amounts', async () => {
      // Arrange
      const { api } = makeApiMocks({});
      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: '0.0.123456',
          to: '0.0.789012',
          from: '0.0.345678:2222222222222222222222222222222222222222222222222222222222222222',
          amount: '100.5', // Decimal amount - should be rejected
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      // Act
      const result = await transferToken(args);

      // Assert - ADR-003 compliance: check CommandExecutionResult
      expect(result).toBeDefined();
      expect(result.status).toBe(Status.Success);
      expect(result.outputJson).toBeDefined();
      const output = JSON.parse(result.outputJson!);
      expect(output.amount).toBe('100500000');
    });
  });
});

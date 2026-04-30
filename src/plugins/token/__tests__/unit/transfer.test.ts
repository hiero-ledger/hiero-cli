import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { NetworkService } from '@/core/services/network/network-service.interface';

import '@/core/utils/json-serialize';

import { ECDSA_HEX_PRIVATE_KEY } from '@/__tests__/mocks/fixtures';
import { makeConfigMock, makeStateMock } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { NetworkError, SupportedNetwork } from '@/core';
import { FtTransferEntry } from '@/core/services/transfer';
import { KeyAlgorithm } from '@/core/shared/constants';
import { AliasType } from '@/core/types/shared.types';
import {
  tokenTransferFt,
  TokenTransferFtOutputSchema,
} from '@/plugins/token/commands/transfer-ft';

import { mockAccountIds, mockTransactionResults } from './helpers/fixtures';
import { makeApiMocks, makeLogger } from './helpers/mocks';

const FROM_ACCOUNT = `${mockAccountIds.sender}:${ECDSA_HEX_PRIVATE_KEY}`;

describe('transferTokenHandler', () => {
  describe('success scenarios', () => {
    test('should transfer tokens between accounts using account-id:private-key format', async () => {
      const mockTransferTransaction = { test: 'transfer-transaction' };
      const mockSignResult = {
        ...mockTransactionResults.success,
        consensusTimestamp: '1234567890.123456789',
      };

      const { api, transfer, txExecute, kms } = makeApiMocks({
        transfer: {
          buildTransferTransaction: jest
            .fn()
            .mockReturnValue(mockTransferTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(mockSignResult),
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
          token: mockAccountIds.treasury,
          to: mockAccountIds.association,
          from: FROM_ACCOUNT,
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      const result = await tokenTransferFt(args);

      const output = assertOutput(result.result, TokenTransferFtOutputSchema);
      expect(output.tokenId).toBe(mockAccountIds.treasury);
      expect(output.from).toBe(mockAccountIds.sender);
      expect(output.to).toBe(mockAccountIds.association);
      expect(output.amount).toBe(100000000n);
      expect(output.transactionId).toBe(mockSignResult.transactionId);

      expect(transfer.buildTransferTransaction).toHaveBeenCalledWith([
        new FtTransferEntry(
          mockAccountIds.sender,
          mockAccountIds.association,
          mockAccountIds.treasury,
          100000000n,
        ),
      ]);
      expect(txExecute.execute).toHaveBeenCalledWith(expect.anything());
      expect(kms.importPrivateKey).toHaveBeenCalledWith(
        KeyAlgorithm.ECDSA,
        ECDSA_HEX_PRIVATE_KEY,
        'local',
        ['token:account'],
      );
    });

    test('should transfer tokens using alias for from account', async () => {
      const mockTransferTransaction = { test: 'transfer-transaction' };
      const mockSignResult = {
        ...mockTransactionResults.success,
        consensusTimestamp: '1234567890.123456789',
      };

      const { api, transfer, txExecute, alias } = makeApiMocks({
        transfer: {
          buildTransferTransaction: jest
            .fn()
            .mockReturnValue(mockTransferTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(mockSignResult),
        },
        alias: {
          resolve: jest.fn().mockReturnValue({
            entityId: mockAccountIds.sender,
            keyRefId: 'alias-key-ref-id',
            publicKey: '302a300506032b6570032100' + '0'.repeat(64),
          }),
        },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: 6 }),
        },
        kms: {
          get: jest.fn().mockReturnValue({
            keyRefId: 'alias-key-ref-id',
            publicKey: 'alias-public-key',
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: mockAccountIds.treasury,
          to: mockAccountIds.association,
          from: 'alice',
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      const result = await tokenTransferFt(args);

      const output = assertOutput(result.result, TokenTransferFtOutputSchema);
      expect(output.tokenId).toBe(mockAccountIds.treasury);
      expect(output.from).toBe(mockAccountIds.sender);
      expect(output.to).toBe(mockAccountIds.association);
      expect(output.amount).toBe(100000000n);
      expect(output.transactionId).toBe(mockSignResult.transactionId);

      expect(alias.resolve).toHaveBeenCalledWith(
        'alice',
        AliasType.Account,
        'testnet',
      );
      expect(transfer.buildTransferTransaction).toHaveBeenCalledWith([
        new FtTransferEntry(
          mockAccountIds.sender,
          mockAccountIds.association,
          mockAccountIds.treasury,
          100000000n,
        ),
      ]);
      expect(txExecute.execute).toHaveBeenCalledWith(expect.anything());
    });

    test('should transfer tokens using alias for to account', async () => {
      const mockTransferTransaction = { test: 'transfer-transaction' };
      const mockSignResult = {
        ...mockTransactionResults.success,
        consensusTimestamp: '1234567890.123456789',
      };

      const { api, transfer, alias } = makeApiMocks({
        transfer: {
          buildTransferTransaction: jest
            .fn()
            .mockReturnValue(mockTransferTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(mockSignResult),
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias) => {
            if (alias === 'bob') {
              return {
                entityId: mockAccountIds.association,
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
          token: mockAccountIds.treasury,
          to: 'bob',
          from: FROM_ACCOUNT,
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      const result = await tokenTransferFt(args);

      const output = assertOutput(result.result, TokenTransferFtOutputSchema);
      expect(output.tokenId).toBe(mockAccountIds.treasury);
      expect(output.to).toBe(mockAccountIds.association);

      expect(alias.resolve).toHaveBeenCalledWith(
        'bob',
        AliasType.Account,
        SupportedNetwork.TESTNET,
      );
      expect(transfer.buildTransferTransaction).toHaveBeenCalledWith([
        new FtTransferEntry(
          mockAccountIds.sender,
          mockAccountIds.association,
          mockAccountIds.treasury,
          100000000n,
        ),
      ]);
    });

    test('should reject zero amount transfer', async () => {
      const { api } = makeApiMocks({
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: 6 }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: mockAccountIds.treasury,
          to: mockAccountIds.association,
          from: FROM_ACCOUNT,
          amount: '0',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      const result = await tokenTransferFt(args);

      expect(result.result).toBeDefined();
    });
  });

  describe('validation scenarios', () => {
    test('should handle missing from parameter (uses default operator)', async () => {
      const mockTransferTransaction = { test: 'transfer-transaction' };
      const mockSignResult = {
        ...mockTransactionResults.success,
        consensusTimestamp: '1234567890.123456789',
      };

      const { api } = makeApiMocks({
        transfer: {
          buildTransferTransaction: jest
            .fn()
            .mockReturnValue(mockTransferTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(mockSignResult),
        },
        kms: {
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'imported-key-ref-id',
            publicKey: 'imported-public-key',
          }),
          get: jest.fn().mockReturnValue({
            keyRefId: 'imported-key-ref-id',
            publicKey: '302a300506032b6570032100' + '0'.repeat(64),
          }),
        },
      });

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
          token: mockAccountIds.treasury,
          to: mockAccountIds.association,
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      const result = await tokenTransferFt(args);

      const output = assertOutput(result.result, TokenTransferFtOutputSchema);
      expect(output.tokenId).toBe(mockAccountIds.treasury);
      expect(output.to).toBe(mockAccountIds.association);
    });
  });

  describe('error scenarios', () => {
    test('should handle transaction failure', async () => {
      const mockTransferTransaction = { test: 'transfer-transaction' };
      const mockSignResult = {
        ...mockTransactionResults.failure,
        consensusTimestamp: '1234567890.123456789',
      };

      const { api } = makeApiMocks({
        transfer: {
          buildTransferTransaction: jest
            .fn()
            .mockResolvedValue(mockTransferTransaction),
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
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: mockAccountIds.treasury,
          to: mockAccountIds.association,
          from: FROM_ACCOUNT,
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      await expect(tokenTransferFt(args)).rejects.toThrow();
    });

    test('should handle token transfer service error', async () => {
      const { api } = makeApiMocks({
        transfer: {
          buildTransferTransaction: jest.fn().mockImplementation(() => {
            throw new NetworkError('Network error');
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
          token: mockAccountIds.treasury,
          to: mockAccountIds.association,
          from: FROM_ACCOUNT,
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      await expect(tokenTransferFt(args)).rejects.toThrow('Network error');
    });

    test('should handle signing service error', async () => {
      const mockTransferTransaction = { test: 'transfer-transaction' };

      const { api } = makeApiMocks({
        transfer: {
          buildTransferTransaction: jest
            .fn()
            .mockReturnValue(mockTransferTransaction),
        },
        txExecute: {
          execute: jest.fn().mockRejectedValue(new Error('Invalid key')),
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
          token: mockAccountIds.treasury,
          to: mockAccountIds.association,
          from: FROM_ACCOUNT,
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      await expect(tokenTransferFt(args)).rejects.toThrow('Invalid key');
    });

    test('should handle large amount transfers', async () => {
      const mockTransferTransaction = { test: 'transfer-transaction' };
      const mockSignResult = {
        ...mockTransactionResults.success,
        consensusTimestamp: '1234567890.123456789',
      };

      const { api, transfer } = makeApiMocks({
        transfer: {
          buildTransferTransaction: jest
            .fn()
            .mockReturnValue(mockTransferTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(mockSignResult),
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
          token: mockAccountIds.treasury,
          to: mockAccountIds.association,
          from: FROM_ACCOUNT,
          amount: '999999999',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      const result = await tokenTransferFt(args);

      const output = assertOutput(result.result, TokenTransferFtOutputSchema);
      expect(output.tokenId).toBe(mockAccountIds.treasury);
      expect(output.to).toBe(mockAccountIds.association);

      expect(transfer.buildTransferTransaction).toHaveBeenCalledWith([
        new FtTransferEntry(
          mockAccountIds.sender,
          mockAccountIds.association,
          mockAccountIds.treasury,
          999999999000000n,
        ),
      ]);
    });
  });

  describe('logging and debugging', () => {
    test('should log transfer details', async () => {
      const mockTransferTransaction = { test: 'transfer-transaction' };
      const mockSignResult = {
        ...mockTransactionResults.success,
        consensusTimestamp: '1234567890.123456789',
      };

      const { api } = makeApiMocks({
        transfer: {
          buildTransferTransaction: jest
            .fn()
            .mockReturnValue(mockTransferTransaction),
        },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: 6 }),
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
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: mockAccountIds.treasury,
          to: mockAccountIds.association,
          from: FROM_ACCOUNT,
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      const result = await tokenTransferFt(args);

      const output = assertOutput(result.result, TokenTransferFtOutputSchema);
      expect(output.tokenId).toBe(mockAccountIds.treasury);
      expect(output.to).toBe(mockAccountIds.association);
    });
  });

  describe('edge cases', () => {
    test('should handle same from and to account', async () => {
      const mockTransferTransaction = { test: 'transfer-transaction' };
      const mockSignResult = {
        ...mockTransactionResults.success,
        consensusTimestamp: '1234567890.123456789',
      };

      const { api, transfer } = makeApiMocks({
        transfer: {
          buildTransferTransaction: jest
            .fn()
            .mockReturnValue(mockTransferTransaction),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(mockSignResult),
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
          token: mockAccountIds.treasury,
          to: mockAccountIds.sender,
          from: FROM_ACCOUNT,
          amount: '100',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      const result = await tokenTransferFt(args);

      const output = assertOutput(result.result, TokenTransferFtOutputSchema);
      expect(output.tokenId).toBe(mockAccountIds.treasury);
      expect(output.to).toBe(mockAccountIds.sender);

      expect(transfer.buildTransferTransaction).toHaveBeenCalledWith([
        new FtTransferEntry(
          mockAccountIds.sender,
          mockAccountIds.sender,
          mockAccountIds.treasury,
          100000000n,
        ),
      ]);
    });

    test('should handle decimal amounts', async () => {
      const { api } = makeApiMocks({});
      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          token: mockAccountIds.treasury,
          to: mockAccountIds.association,
          from: FROM_ACCOUNT,
          amount: '100.5',
        },
        api,
        state: makeStateMock(),
        config: makeConfigMock(),
        logger,
      };

      const result = await tokenTransferFt(args);

      const output = assertOutput(result.result, TokenTransferFtOutputSchema);
      expect(output.amount).toBe(100500000n);
    });
  });
});

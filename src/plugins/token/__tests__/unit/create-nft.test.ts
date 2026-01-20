/**
 * Token Create Handler Unit Tests
 * Tests the token creation functionality of the token plugin
 * Updated for ADR-003 compliance
 */
import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import { HederaTokenType, Status } from '@/core/shared/constants';
import { createNft } from '@/plugins/token/commands/create-nft';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import {
  expectedNftTransactionParams,
  makeNftCreateCommandArgs,
  mockAccountIds,
  mockTransactions,
} from './helpers/fixtures';
import {
  makeApiMocks,
  makeLogger,
  makeTransactionResult,
} from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

describe('createNftHandler', () => {
  beforeEach(() => {
    MockedHelper.mockClear();
    MockedHelper.mockImplementation(() => ({
      saveToken: jest.fn().mockResolvedValue(undefined),
    }));
  });

  describe('success scenarios', () => {
    test('should create NFT with valid parameters', async () => {
      // Arrange
      const mockSaveToken = jest.fn();
      const mockSignResult = makeTransactionResult({
        tokenId: mockAccountIds.treasury,
      });

      MockedHelper.mockImplementation(() => ({
        saveToken: mockSaveToken,
      }));

      const { api, tokenTransactions, signing } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTransactions.token),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
        },
        kms: {
          getPublicKey: jest.fn().mockReturnValue('operator-public-key'),
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'treasury-key-ref-id',
            publicKey: 'treasury-public-key',
          }),
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias, type) => {
            // Mock account alias resolution
            if (type === 'account' && alias === 'treasury-account') {
              return {
                entityId: '0.0.123456',
                publicKey: '302a300506032b6570032100' + '1'.repeat(64),
                keyRefId: 'treasury-key-ref-id',
              };
            }
            // Mock account alias resolution for admin-key
            if (type === 'account' && alias === 'test-admin-key') {
              return {
                entityId: '0.0.100000',
                publicKey: '302a300506032b6570032100' + '0'.repeat(64),
                keyRefId: 'admin-key-ref-id',
              };
            }
            // Mock account alias resolution for supply-key
            if (type === 'account' && alias === 'test-supply-key') {
              return {
                entityId: '0.0.200000',
                publicKey: '302a300506032b6570032100' + '0'.repeat(64),
                keyRefId: 'supply-key-ref-id',
              };
            }
            return null;
          }),
        },
      });

      const logger = makeLogger();
      const args = makeNftCreateCommandArgs({ api, logger });

      // Act
      const result = await createNft(args);

      // Assert
      // Note: importPrivateKey is NOT called because treasury is resolved from alias
      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalledWith(
        expectedNftTransactionParams,
      );
      expect(signing.signAndExecuteWith).toHaveBeenCalledWith(
        mockTransactions.token,
        expect.arrayContaining(['admin-key-ref-id', 'treasury-key-ref-id']),
      );
      expect(mockSaveToken).toHaveBeenCalled();
      expect(result.status).toBe(Status.Success);
    });

    test('should use default credentials when treasury not provided', async () => {
      // Arrange
      const mockSaveToken = jest.fn();
      const mockSignResult = makeTransactionResult({
        tokenId: mockAccountIds.treasury,
      });

      MockedHelper.mockImplementation(() => ({
        saveToken: mockSaveToken,
      }));

      const { api, tokenTransactions, signing } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTransactions.token),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act
      const result = await createNft(args);

      // Assert
      // keyResolver.resolveKeyOrAliasWithFallback is called which internally uses getOperator
      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalledWith({
        name: 'TestToken',
        symbol: 'TEST',
        decimals: 0,
        initialSupplyRaw: 0n,
        supplyType: 'INFINITE',
        maxSupplyRaw: undefined,
        treasuryId: '0.0.100000',
        tokenType: HederaTokenType.NON_FUNGIBLE_TOKEN,
        adminPublicKey: expect.any(Object),
        supplyPublicKey: expect.any(Object),
        memo: undefined,
      });
      // When adminKey is not provided, only treasury signs (which is the operator)
      expect(signing.signAndExecuteWith).toHaveBeenCalledWith(
        mockTransactions.token,
        ['operator-key-ref-id'],
      );
      expect(mockSaveToken).toHaveBeenCalled();
      expect(result.status).toBe(Status.Success);
      // This test is now ADR-003 compliant
    });
  });

  describe('validation scenarios', () => {
    test('should exit with error when no credentials found', async () => {
      // Arrange
      const { api, keyResolver } = makeApiMocks();

      // Mock keyResolver to throw error when no operator is available
      keyResolver.getOrInitKeyWithFallback.mockImplementation(() =>
        Promise.reject(new Error('No operator set')),
      );

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act & Assert - Error is thrown before try-catch block in handler
      await expect(createNft(args)).rejects.toThrow('No operator set');
    });
  });

  describe('state management', () => {
    test('should initialize token state helper', async () => {
      // Arrange
      const mockSaveToken = jest.fn();
      const mockTokenTransaction = { test: 'transaction' };
      const mockSignResult = makeTransactionResult({ tokenId: '0.0.123456' });

      MockedHelper.mockImplementation(() => ({
        saveToken: mockSaveToken,
      }));

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTokenTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockResolvedValue(mockSignResult),
        },
        kms: {
          getPublicKey: jest.fn().mockReturnValue('operator-public-key'),
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias, type) => {
            // Mock account alias resolution
            if (type === 'account' && alias === 'treasury-account') {
              return {
                entityId: '0.0.123456',
                publicKey: '302a300506032b6570032100' + '1'.repeat(64),
                keyRefId: 'treasury-key-ref-id',
              };
            }
            // Mock account alias resolution for admin-key
            if (type === 'account' && alias === 'test-admin-key') {
              return {
                entityId: '0.0.100000',
                publicKey: '302a300506032b6570032100' + '0'.repeat(64),
                keyRefId: 'admin-key-ref-id',
              };
            }
            // Mock account alias resolution for supply-key
            if (type === 'account' && alias === 'test-supply-key') {
              return {
                entityId: '0.0.100000',
                publicKey: '302a300506032b6570032100' + '0'.repeat(64),
                keyRefId: 'supply-key-ref-id',
              };
            }
            return null;
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          adminKey: 'test-admin-key',
          supplyKey: 'test-supply-key',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act
      const result = await createNft(args);

      // Assert
      expect(MockedHelper).toHaveBeenCalledWith(api.state, logger);
      expect(mockSaveToken).toHaveBeenCalled();
      expect(result.status).toBe(Status.Success);
      // This test is now ADR-003 compliant
    });
  });
});

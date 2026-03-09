import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import { assertOutput } from '@/__tests__/utils/assert-output';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { HederaTokenType } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import {
  createNft,
  CreateNftOutputSchema,
} from '@/plugins/token/commands/create-nft';
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

      const { api, tokenTransactions, txExecute } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTransactions.token),
        },
        txExecute: {
          executeBytes: jest.fn().mockResolvedValue(mockSignResult),
        },
        kms: {
          get: jest.fn().mockReturnValue({
            keyRefId: 'operator-key-ref-id',
            publicKey: 'operator-public-key',
          }),
          importPrivateKey: jest.fn().mockReturnValue({
            keyRefId: 'treasury-key-ref-id',
            publicKey: 'treasury-public-key',
          }),
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias, type) => {
            if (type === AliasType.Account && alias === 'treasury-account') {
              return {
                entityId: '0.0.123456',
                publicKey: '302a300506032b6570032100' + '1'.repeat(64),
                keyRefId: 'treasury-key-ref-id',
              };
            }
            if (type === AliasType.Account && alias === 'test-admin-key') {
              return {
                entityId: '0.0.100000',
                publicKey: '302a300506032b6570032100' + '0'.repeat(64),
                keyRefId: 'admin-key-ref-id',
              };
            }
            if (type === AliasType.Account && alias === 'test-supply-key') {
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
      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalledWith(
        expectedNftTransactionParams,
      );
      expect(txExecute.executeBytes).toHaveBeenCalledWith(
        expect.any(Uint8Array),
      );
      expect(mockSaveToken).toHaveBeenCalled();
      assertOutput(result.result, CreateNftOutputSchema);
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

      const { api, tokenTransactions, txExecute } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTransactions.token),
        },
        txExecute: {
          executeBytes: jest.fn().mockResolvedValue(mockSignResult),
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
      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalledWith({
        name: 'TestToken',
        symbol: 'TEST',
        decimals: 0,
        initialSupplyRaw: 0n,
        supplyType: SupplyType.INFINITE,
        maxSupplyRaw: undefined,
        treasuryId: '0.0.100000',
        tokenType: HederaTokenType.NON_FUNGIBLE_TOKEN,
        adminPublicKey: expect.any(Object),
        supplyPublicKey: expect.any(Object),
        memo: undefined,
      });
      expect(txExecute.executeBytes).toHaveBeenCalledWith(
        expect.any(Uint8Array),
      );
      expect(mockSaveToken).toHaveBeenCalled();
      assertOutput(result.result, CreateNftOutputSchema);
    });
  });

  describe('validation scenarios', () => {
    test('should exit with error when no credentials found', async () => {
      // Arrange
      const { api, keyResolver } = makeApiMocks();

      keyResolver.resolveAccountCredentialsWithFallback.mockImplementation(() =>
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
        txExecute: {
          executeBytes: jest.fn().mockResolvedValue(mockSignResult),
        },
        kms: {
          get: jest.fn().mockReturnValue({
            keyRefId: 'operator-key-ref-id',
            publicKey: 'operator-public-key',
          }),
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias, type) => {
            if (type === AliasType.Account && alias === 'treasury-account') {
              return {
                entityId: '0.0.123456',
                publicKey: '302a300506032b6570032100' + '1'.repeat(64),
                keyRefId: 'treasury-key-ref-id',
              };
            }
            if (type === AliasType.Account && alias === 'test-admin-key') {
              return {
                entityId: '0.0.100000',
                publicKey: '302a300506032b6570032100' + '0'.repeat(64),
                keyRefId: 'admin-key-ref-id',
              };
            }
            if (type === AliasType.Account && alias === 'test-supply-key') {
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
      await createNft(args);

      // Assert
      expect(MockedHelper).toHaveBeenCalledWith(api.state, logger);
      expect(mockSaveToken).toHaveBeenCalled();
    });
  });
});

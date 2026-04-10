import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { TokenCreateNftOutput } from '@/plugins/token/commands/create-nft/output';

import { assertOutput } from '@/__tests__/utils/assert-output';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { HederaTokenType } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import {
  tokenCreateNft,
  TokenCreateNftOutputSchema,
} from '@/plugins/token/commands/create-nft';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import {
  expectedNftTransactionParams,
  makeNftCreateCommandArgs,
  mockAccountIds,
  mockAccountKeyPairs,
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

describe('tokenCreateNftHandler', () => {
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
          execute: jest.fn().mockResolvedValue(mockSignResult),
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
      const result = await tokenCreateNft(args);

      // Assert
      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalledWith(
        expectedNftTransactionParams,
      );
      expect(txExecute.execute).toHaveBeenCalledWith(expect.anything());
      expect(mockSaveToken).toHaveBeenCalled();
      assertOutput(result.result, TokenCreateNftOutputSchema);
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

      const { api, tokenTransactions, keyResolver, txExecute } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTransactions.token),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(mockSignResult),
        },
      });

      keyResolver.resolveSigningKey.mockResolvedValue({
        keyRefId: 'supply-key-ref-id',
        publicKey: '302a300506032b6570032100' + '0'.repeat(64),
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          supplyKey: 'test-supply-key',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      // Act
      const result = await tokenCreateNft(args);

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
        adminKey: undefined,
        supplyKey: expect.any(Object),
        memo: undefined,
      });
      expect(txExecute.execute).toHaveBeenCalledWith(expect.anything());
      expect(mockSaveToken).toHaveBeenCalled();
      assertOutput(result.result, TokenCreateNftOutputSchema);
    });
  });

  describe('optional key scenarios', () => {
    test('should create NFT with all optional keys', async () => {
      const mockSaveToken = jest.fn();
      const mockSignResult = makeTransactionResult({
        tokenId: mockAccountIds.treasury,
      });

      MockedHelper.mockImplementation(() => ({
        saveToken: mockSaveToken,
      }));

      const { api, tokenTransactions } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTransactions.token),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(mockSignResult),
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
            return null;
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestNFT',
          symbol: 'TNFT',
          supplyType: SupplyType.INFINITE,
          treasury: 'treasury-account',
          freezeKey: mockAccountKeyPairs.freeze,
          wipeKey: mockAccountKeyPairs.wipe,
          pauseKey: mockAccountKeyPairs.pause,
          kycKey: mockAccountKeyPairs.kyc,
          feeScheduleKey: mockAccountKeyPairs.feeSchedule,
          metadataKey: mockAccountKeyPairs.supply,
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenCreateNft(args);

      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          freezeKey: expect.any(Object),
          wipeKey: expect.any(Object),
          pauseKey: expect.any(Object),
          kycKey: expect.any(Object),
          feeScheduleKey: expect.any(Object),
          metadataKey: expect.any(Object),
        }),
      );
      assertOutput(result.result, TokenCreateNftOutputSchema);
      const output = result.result as TokenCreateNftOutput;
      expect(output.freezePublicKey).toBeDefined();
      expect(output.wipePublicKey).toBeDefined();
      expect(output.pausePublicKey).toBeDefined();
      expect(output.kycPublicKey).toBeDefined();
      expect(output.feeSchedulePublicKey).toBeDefined();
      expect(output.metadataPublicKey).toBeDefined();
    });

    test('should create NFT with lifecycle params', async () => {
      const mockSaveToken = jest.fn();
      const mockSignResult = makeTransactionResult({
        tokenId: mockAccountIds.treasury,
      });

      MockedHelper.mockImplementation(() => ({
        saveToken: mockSaveToken,
      }));

      const { api, tokenTransactions } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTransactions.token),
        },
        txExecute: {
          execute: jest.fn().mockResolvedValue(mockSignResult),
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
            return null;
          }),
        },
      });

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestNFT',
          symbol: 'TNFT',
          supplyType: SupplyType.INFINITE,
          treasury: 'treasury-account',
          autoRenewPeriod: 7776000,
          autoRenewAccountId: '0.0.100000',
          expirationTime: '2027-01-01T00:00:00Z',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      const result = await tokenCreateNft(args);

      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          autoRenewPeriod: 7776000,
          autoRenewAccountId: '0.0.100000',
          expirationTime: expect.any(Date),
        }),
      );
      assertOutput(result.result, TokenCreateNftOutputSchema);
    });
  });

  describe('validation scenarios', () => {
    test('should reject freezeDefault without freezeKey', async () => {
      const { api } = makeApiMocks();
      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestNFT',
          symbol: 'TNFT',
          supplyType: SupplyType.INFINITE,
          freezeDefault: true,
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenCreateNft(args)).rejects.toThrow(
        /freezeDefault requires freezeKey/,
      );
    });

    test('should exit with error when no credentials found', async () => {
      // Arrange
      const { api, keyResolver } = makeApiMocks();

      keyResolver.resolveAccountCredentials.mockImplementation(() =>
        Promise.reject(new Error('No operator set')),
      );
      keyResolver.resolveSigningKey.mockImplementation(() =>
        Promise.reject(new Error('No operator set')),
      );

      const logger = makeLogger();
      const args: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          supplyKey: 'test-supply-key',
        },
        api,
        state: api.state,
        config: api.config,
        logger,
      };

      await expect(tokenCreateNft(args)).rejects.toThrow('No operator set');
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
          execute: jest.fn().mockResolvedValue(mockSignResult),
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
      await tokenCreateNft(args);

      // Assert
      expect(MockedHelper).toHaveBeenCalledWith(api.state, logger);
      expect(mockSaveToken).toHaveBeenCalled();
    });
  });
});

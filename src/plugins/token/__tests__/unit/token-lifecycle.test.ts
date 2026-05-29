import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import '@/core/utils/json-serialize';

import { FtTransferEntry } from '@/core/services/transfer';
import { HederaTokenType } from '@/core/shared/constants';
import { AliasType, SupplyType } from '@/core/types/shared.types';
import { tokenAssociate } from '@/plugins/token/commands/associate';
import { tokenCreateFt } from '@/plugins/token/commands/create-ft';
import { tokenTransferFt } from '@/plugins/token/commands/transfer-ft';
import { TokenStateServiceImpl } from '@/plugins/token/services/token-state.service';

import {
  mockAccountIds,
  mockKeys,
  mockTransactionResults,
} from './helpers/fixtures';
import { makeApiMocks, mockTokenStateServiceImpl } from './helpers/mocks';

jest.mock('../../services/token-state.service', () => ({
  TokenStateServiceImpl: jest.fn(),
}));

const MockedHelper = TokenStateServiceImpl as jest.Mock;

describe('Token Lifecycle Integration', () => {
  beforeEach(() => {
    mockTokenStateServiceImpl(MockedHelper);
  });

  describe('complete token lifecycle', () => {
    test('should handle create -> associate -> transfer flow', async () => {
      const mockAddToken = jest.fn();
      const token = '0.0.123456';
      const _treasuryAccountId = mockAccountIds.treasury;
      const userAccountId = mockAccountIds.association;
      const treasuryKey = mockKeys.treasury;
      const userKey = mockKeys.association;

      mockTokenStateServiceImpl(MockedHelper, {
        addToken: mockAddToken,
      });

      const mockTokenTransaction = { type: 'token-create' };
      const mockAssociationTransaction = { type: 'association' };
      const mockTransferTransaction = { type: 'transfer' };

      const { api, tokenTransactions, transfer } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTokenTransaction),
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        transfer: {
          buildTransferTransaction: jest
            .fn()
            .mockReturnValue(mockTransferTransaction),
        },
        txExecute: {
          execute: jest
            .fn()
            .mockResolvedValueOnce({
              ...mockTransactionResults.success,
              transactionId: `${token}@1234567890.123456789`,
              tokenId: token,
            })
            .mockResolvedValueOnce({
              ...mockTransactionResults.successWithAssociation,
              transactionId: '0.0.123@1234567890.123456790',
            })
            .mockResolvedValueOnce({
              ...mockTransactionResults.success,
              transactionId: '0.0.123@1234567890.123456791',
            }),
        },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: 2 }),
          getAccountTokenBalances: jest.fn().mockResolvedValue({ tokens: [] }),
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias, type) => {
            if (type === AliasType.Account && alias === 'admin-key') {
              return {
                entityId: '0.0.100000',
                publicKey: '302a300506032b6570032100' + '0'.repeat(64),
                keyRefId: 'admin-key-ref-id',
              };
            }
            return null;
          }),
        },
      });

      // Step 1: Create Token
      const createArgs: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          decimals: 2,
          initialSupply: '1000',
          maxSupply: '1000',
          supplyType: SupplyType.FINITE,
          treasury: `${_treasuryAccountId}:${treasuryKey}`,
          adminKey: ['admin-key'],
        },
        api,
      };

      const createResult = await tokenCreateFt(createArgs);
      expect(createResult.result).toBeDefined();

      // Step 2: Associate Token
      const associateArgs: CommandHandlerArgs = {
        args: {
          token,
          account: `${userAccountId}:${userKey}`,
        },
        api,
      };

      const associateResult = await tokenAssociate(associateArgs);
      expect(associateResult.result).toBeDefined();

      // Step 3: Transfer Token
      const transferArgs: CommandHandlerArgs = {
        args: {
          token,
          from: `${_treasuryAccountId}:${treasuryKey}`,
          to: userAccountId,
          amount: '100',
        },
        api,
      };

      const transferResult = await tokenTransferFt(transferArgs);
      expect(transferResult.result).toBeDefined();

      // Verify all operations were called correctly
      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalledWith({
        name: 'TestToken',
        symbol: 'TEST',
        decimals: 2,
        initialSupplyRaw: 100000n,
        supplyType: SupplyType.FINITE,
        maxSupplyRaw: 100000n,
        treasuryId: _treasuryAccountId,
        adminKey: expect.any(Object),
        supplyKey: undefined,
        freezeKey: undefined,
        wipeKey: undefined,
        kycKey: undefined,
        pauseKey: undefined,
        feeScheduleKey: undefined,
        metadataKey: undefined,
        freezeDefault: undefined,
        tokenType: HederaTokenType.FUNGIBLE_COMMON,
        memo: undefined,
        autoRenewPeriodSeconds: undefined,
        autoRenewAccountId: undefined,
        expirationTime: undefined,
      });

      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalledWith({
        tokenId: token,
        accountId: userAccountId,
      });

      expect(transfer.buildTransferTransaction).toHaveBeenCalledWith([
        new FtTransferEntry(
          mockAccountIds.treasury,
          mockAccountIds.association,
          token,
          10000n,
        ),
      ]);

      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalled();
      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalled();
      expect(transfer.buildTransferTransaction).toHaveBeenCalled();
    });

    test('should handle partial failure in lifecycle', async () => {
      const mockAddToken = jest.fn();
      const token = '0.0.123456';
      const userAccountId = mockAccountIds.association;
      const treasuryKey = mockKeys.treasury;
      const userKey = mockKeys.kyc;

      mockTokenStateServiceImpl(MockedHelper, {
        addToken: mockAddToken,
      });

      const mockTokenTransaction = { type: 'token-create' };
      const mockAssociationTransaction = { type: 'association' };

      const { api, tokenTransactions: tokenTransactions } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTokenTransaction),
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        txExecute: {
          execute: jest
            .fn()
            .mockResolvedValueOnce({
              ...mockTransactionResults.success,
              transactionId: `${token}@1234567890.123456789`,
              tokenId: token,
            })
            .mockResolvedValueOnce({
              ...mockTransactionResults.successWithAssociation,
              transactionId: '0.0.123@1234567890.123456790',
            }),
        },
        mirror: {
          getAccountTokenBalances: jest.fn().mockResolvedValue({ tokens: [] }),
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias, type) => {
            if (type === AliasType.Account && alias === 'admin-key') {
              return {
                entityId: '0.0.100000',
                publicKey: '302a300506032b6570032100' + '0'.repeat(64),
                keyRefId: 'admin-key-ref-id',
              };
            }
            return null;
          }),
        },
      });

      // Step 1: Create Token (success)
      const createArgs: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          treasuryKey,
          adminKey: ['admin-key'],
        },
        api,
      };

      const createResult = await tokenCreateFt(createArgs);
      expect(createResult.result).toBeDefined();

      // Step 2: Associate Token (success)
      const associateArgs: CommandHandlerArgs = {
        args: {
          token,
          account: `${userAccountId}:${userKey}`,
        },
        api,
      };

      const associateResult = await tokenAssociate(associateArgs);
      expect(associateResult.result).toBeDefined();

      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalled();
      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalled();
    });

    test('should handle multiple associations for same token', async () => {
      const mockAddToken = jest.fn();
      const token = '0.0.123456';
      const userAccountId1 = mockAccountIds.association;
      const userAccountId2 = mockAccountIds.receiver;
      const treasuryKey = mockKeys.treasury;
      const userKey1 = mockKeys.freeze;
      const userKey2 = mockKeys.pause;

      mockTokenStateServiceImpl(MockedHelper, {
        addToken: mockAddToken,
      });

      const mockTokenTransaction = { type: 'token-create' };
      const mockAssociationTransaction1 = { type: 'association-1' };
      const mockAssociationTransaction2 = { type: 'association-2' };

      const { api, tokenTransactions: tokenTransactions } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTokenTransaction),
          createTokenAssociationTransaction: jest
            .fn()
            .mockImplementation(({ accountId }) => {
              if (accountId === userAccountId1) {
                return mockAssociationTransaction1;
              }
              return mockAssociationTransaction2;
            }),
        },
        txExecute: {
          execute: jest
            .fn()
            .mockResolvedValueOnce({
              ...mockTransactionResults.success,
              transactionId: '0.0.123@1234567890.123456789',
              tokenId: '0.0.123456',
              consensusTimestamp: '2024-01-01T00:00:00.000Z',
            })
            .mockResolvedValue({
              ...mockTransactionResults.success,
              transactionId: '0.0.123@1234567890.123456789',
              consensusTimestamp: '2024-01-01T00:00:00.000Z',
            }),
        },
        mirror: {
          getAccountTokenBalances: jest.fn().mockResolvedValue({ tokens: [] }),
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias, type) => {
            if (type === AliasType.Account && alias === 'admin-key') {
              return {
                entityId: '0.0.100000',
                publicKey: '302a300506032b6570032100' + '0'.repeat(64),
                keyRefId: 'admin-key-ref-id',
              };
            }
            return null;
          }),
        },
      });

      // Step 1: Create Token
      const createArgs: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          treasuryKey,
          adminKey: ['admin-key'],
        },
        api,
      };

      const createResult = await tokenCreateFt(createArgs);
      expect(createResult.result).toBeDefined();

      // Step 2: Associate with first user
      const associateArgs1: CommandHandlerArgs = {
        args: {
          token,
          account: `${userAccountId1}:${userKey1}`,
        },
        api,
      };

      const associateResult1 = await tokenAssociate(associateArgs1);
      expect(associateResult1.result).toBeDefined();

      // Step 3: Associate with second user
      const associateArgs2: CommandHandlerArgs = {
        args: {
          token,
          account: `${userAccountId2}:${userKey2}`,
        },
        api,
      };

      const associateResult2 = await tokenAssociate(associateArgs2);
      expect(associateResult2.result).toBeDefined();

      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalled();
      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalled();
    });
  });

  describe('state consistency', () => {
    test('should maintain consistent state across operations', async () => {
      const mockAddToken = jest.fn();
      const token = '0.0.123456';
      const userAccountId = '0.0.345678';

      const stateHelper = {
        addToken: mockAddToken,
        getToken: jest.fn().mockReturnValue(null),
      };

      MockedHelper.mockImplementation(() => stateHelper);

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest.fn().mockReturnValue({}),
          createTokenAssociationTransaction: jest.fn().mockReturnValue({}),
        },
        txExecute: {
          execute: jest.fn().mockReturnValue({
            ...mockTransactionResults.success,
            transactionId: '0.0.123@1234567890.123456789',
          }),
        },
        mirror: {
          getAccountTokenBalances: jest.fn().mockResolvedValue({ tokens: [] }),
        },
      });

      // Create token - this will throw because execute returns no tokenId
      const createArgs: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          treasuryKey: 'treasury-key',
          adminKey: ['admin-key'],
        },
        api,
      };

      await expect(tokenCreateFt(createArgs)).rejects.toThrow();

      const associateArgs: CommandHandlerArgs = {
        args: {
          token,
          account: `${userAccountId}:5555555555555555555555555555555555555555555555555555555555555555`,
        },
        api,
      };

      const associateResult = await tokenAssociate(associateArgs);
      expect(associateResult.result).toBeDefined();

      expect(MockedHelper).toHaveBeenCalled();
    });
  });
});

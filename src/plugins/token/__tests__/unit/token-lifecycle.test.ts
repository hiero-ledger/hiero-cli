import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { ConfigService } from '@/core/services/config/config-service.interface';
import type { StateService } from '@/core/services/state/state-service.interface';

import '@/core/utils/json-serialize';

import { makeConfigMock, makeStateMock } from '@/__tests__/mocks/mocks';
import { HederaTokenType } from '@/core/shared/constants';
import { SupplyType } from '@/core/types/shared.types';
import { associateToken } from '@/plugins/token/commands/associate';
import { createToken } from '@/plugins/token/commands/create-ft';
import { transferToken } from '@/plugins/token/commands/transfer-ft';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import {
  mockAccountIds,
  mockKeys,
  mockTransactionResults,
} from './helpers/fixtures';
import {
  makeApiMocks,
  makeLogger,
  mockZustandTokenStateHelper,
} from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandTokenStateHelper: jest.fn(),
}));

const MockedHelper = ZustandTokenStateHelper as jest.Mock;

describe('Token Lifecycle Integration', () => {
  beforeEach(() => {
    mockZustandTokenStateHelper(MockedHelper);
  });

  describe('complete token lifecycle', () => {
    test('should handle create -> associate -> transfer flow', async () => {
      const mockAddToken = jest.fn();
      const mockAddAssociation = jest.fn();
      const token = '0.0.123456';
      const _treasuryAccountId = mockAccountIds.treasury;
      const userAccountId = mockAccountIds.association;
      const treasuryKey = mockKeys.treasury;
      const userKey = mockKeys.association;

      mockZustandTokenStateHelper(MockedHelper, {
        addToken: mockAddToken,
        addAssociation: mockAddAssociation,
      });

      const mockTokenTransaction = { type: 'token-create' };
      const mockAssociationTransaction = { type: 'association' };
      const mockTransferTransaction = { type: 'transfer' };

      const { api, tokenTransactions: tokenTransactions } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTokenTransaction),
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
          createTransferTransaction: jest
            .fn()
            .mockReturnValue(mockTransferTransaction),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockImplementation((transaction) => {
            if (transaction === mockTokenTransaction) {
              return Promise.resolve({
                ...mockTransactionResults.success,
                transactionId: `${token}@1234567890.123456789`,
                tokenId: token,
              });
            }
            if (transaction === mockAssociationTransaction) {
              return Promise.resolve({
                ...mockTransactionResults.successWithAssociation,
                transactionId: '0.0.123@1234567890.123456790',
              });
            }
            if (transaction === mockTransferTransaction) {
              return Promise.resolve({
                ...mockTransactionResults.success,
                transactionId: '0.0.123@1234567890.123456791',
              });
            }
            return Promise.resolve({
              success: false,
              transactionId: '',
              receipt: { status: { status: 'failed', transactionId: '' } },
            });
          }),
        },
        mirror: {
          getTokenInfo: jest.fn().mockResolvedValue({ decimals: 2 }),
          getAccountTokenBalances: jest.fn().mockResolvedValue({ tokens: [] }),
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias, type) => {
            if (type === 'account' && alias === 'admin-key') {
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

      const logger = makeLogger();

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
          adminKey: 'admin-key',
        },
        api,
        logger,
        state: makeStateMock() as StateService,
        config: makeConfigMock() as ConfigService,
      };

      const createResult = await createToken(createArgs);
      expect(createResult.result).toBeDefined();

      // Step 2: Associate Token
      const associateArgs: CommandHandlerArgs = {
        args: {
          token,
          account: `${userAccountId}:${userKey}`,
        },
        api,
        logger,
        state: makeStateMock() as StateService,
        config: makeConfigMock() as ConfigService,
      };

      const associateResult = await associateToken(associateArgs);
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
        logger,
        state: makeStateMock() as StateService,
        config: makeConfigMock() as ConfigService,
      };

      const transferResult = await transferToken(transferArgs);
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
        adminPublicKey: expect.any(Object),
        tokenType: HederaTokenType.FUNGIBLE_COMMON,
        memo: undefined,
      });

      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalledWith({
        tokenId: token,
        accountId: userAccountId,
      });

      expect(tokenTransactions.createTransferTransaction).toHaveBeenCalledWith({
        tokenId: token,
        fromAccountId: _treasuryAccountId,
        toAccountId: userAccountId,
        amount: 10000n,
      });

      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalled();
      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalled();
      expect(tokenTransactions.createTransferTransaction).toHaveBeenCalled();
    });

    test('should handle partial failure in lifecycle', async () => {
      const mockAddToken = jest.fn();
      const token = '0.0.123456';
      const userAccountId = mockAccountIds.association;
      const treasuryKey = mockKeys.treasury;
      const userKey = mockKeys.kyc;

      mockZustandTokenStateHelper(MockedHelper, {
        addToken: mockAddToken,
        addAssociation: jest.fn(),
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
        signing: {
          signAndExecuteWith: jest.fn().mockImplementation((transaction) => {
            if (transaction === mockTokenTransaction) {
              return Promise.resolve({
                ...mockTransactionResults.success,
                transactionId: `${token}@1234567890.123456789`,
                tokenId: token,
              });
            }
            if (transaction === mockAssociationTransaction) {
              return Promise.resolve({
                ...mockTransactionResults.successWithAssociation,
                transactionId: '0.0.123@1234567890.123456790',
              });
            }
            return Promise.resolve({
              success: false,
              transactionId: '',
              receipt: { status: { status: 'failed', transactionId: '' } },
            });
          }),
        },
        mirror: {
          getAccountTokenBalances: jest.fn().mockResolvedValue({ tokens: [] }),
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias, type) => {
            if (type === 'account' && alias === 'admin-key') {
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

      const logger = makeLogger();

      // Step 1: Create Token (success)
      const createArgs: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          treasuryKey,
          adminKey: 'admin-key',
        },
        api,
        logger,
        state: makeStateMock() as StateService,
        config: makeConfigMock() as ConfigService,
      };

      const createResult = await createToken(createArgs);
      expect(createResult.result).toBeDefined();

      // Step 2: Associate Token (success)
      const associateArgs: CommandHandlerArgs = {
        args: {
          token,
          account: `${userAccountId}:${userKey}`,
        },
        api,
        logger,
        state: makeStateMock() as StateService,
        config: makeConfigMock() as ConfigService,
      };

      const associateResult = await associateToken(associateArgs);
      expect(associateResult.result).toBeDefined();

      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalled();
      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalled();
    });

    test('should handle multiple associations for same token', async () => {
      const mockAddToken = jest.fn();
      const mockAddAssociation = jest.fn();
      const token = '0.0.123456';
      const userAccountId1 = mockAccountIds.association;
      const userAccountId2 = mockAccountIds.receiver;
      const treasuryKey = mockKeys.treasury;
      const userKey1 = mockKeys.freeze;
      const userKey2 = mockKeys.pause;

      mockZustandTokenStateHelper(MockedHelper, {
        addToken: mockAddToken,
        addAssociation: mockAddAssociation,
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
        signing: {
          signAndExecuteWith: jest.fn().mockImplementation((transaction) => {
            if (
              transaction === mockTokenTransaction ||
              transaction === mockAssociationTransaction1 ||
              transaction === mockAssociationTransaction2
            ) {
              return Promise.resolve({
                ...mockTransactionResults.success,
                transactionId: '0.0.123@1234567890.123456789',
                tokenId:
                  transaction === mockTokenTransaction
                    ? '0.0.123456'
                    : undefined,
                consensusTimestamp: '2024-01-01T00:00:00.000Z',
              });
            }
            return Promise.resolve({
              success: false,
              error: 'Unknown transaction',
              transactionId: '',
              receipt: null,
            });
          }),
        },
        mirror: {
          getAccountTokenBalances: jest.fn().mockResolvedValue({ tokens: [] }),
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias, type) => {
            if (type === 'account' && alias === 'admin-key') {
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

      const logger = makeLogger();

      // Step 1: Create Token
      const createArgs: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          treasuryKey,
          adminKey: 'admin-key',
        },
        api,
        logger,
        state: makeStateMock() as StateService,
        config: makeConfigMock() as ConfigService,
      };

      const createResult = await createToken(createArgs);
      expect(createResult.result).toBeDefined();

      // Step 2: Associate with first user
      const associateArgs1: CommandHandlerArgs = {
        args: {
          token,
          account: `${userAccountId1}:${userKey1}`,
        },
        api,
        logger,
        state: makeStateMock() as StateService,
        config: makeConfigMock() as ConfigService,
      };

      const associateResult1 = await associateToken(associateArgs1);
      expect(associateResult1.result).toBeDefined();

      // Step 3: Associate with second user
      const associateArgs2: CommandHandlerArgs = {
        args: {
          token,
          account: `${userAccountId2}:${userKey2}`,
        },
        api,
        logger,
        state: makeStateMock() as StateService,
        config: makeConfigMock() as ConfigService,
      };

      const associateResult2 = await associateToken(associateArgs2);
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
      const mockAddAssociation = jest.fn();
      const token = '0.0.123456';
      const userAccountId = '0.0.345678';

      const stateHelper = {
        addToken: mockAddToken,
        addAssociation: mockAddAssociation,
        getToken: jest.fn().mockReturnValue(null),
      };

      MockedHelper.mockImplementation(() => stateHelper);

      const { api } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest.fn().mockReturnValue({}),
          createTokenAssociationTransaction: jest.fn().mockReturnValue({}),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockReturnValue({
            ...mockTransactionResults.success,
            transactionId: '0.0.123@1234567890.123456789',
          }),
        },
        mirror: {
          getAccountTokenBalances: jest.fn().mockResolvedValue({ tokens: [] }),
        },
      });

      const logger = makeLogger();

      // Create token - this will throw because signAndExecuteWith returns no tokenId
      const createArgs: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          treasuryKey: 'treasury-key',
          adminKey: 'admin-key',
        },
        api,
        logger,
        state: makeStateMock() as StateService,
        config: makeConfigMock() as ConfigService,
      };

      await expect(createToken(createArgs)).rejects.toThrow();

      const associateArgs: CommandHandlerArgs = {
        args: {
          token,
          account: `${userAccountId}:5555555555555555555555555555555555555555555555555555555555555555`,
        },
        api,
        logger,
        state: makeStateMock() as StateService,
        config: makeConfigMock() as ConfigService,
      };

      const associateResult = await associateToken(associateArgs);
      expect(associateResult.result).toBeDefined();

      expect(MockedHelper).toHaveBeenCalledTimes(2);
      expect(MockedHelper).toHaveBeenNthCalledWith(1, api.state, logger);
      expect(MockedHelper).toHaveBeenNthCalledWith(2, api.state, logger);
    });
  });
});

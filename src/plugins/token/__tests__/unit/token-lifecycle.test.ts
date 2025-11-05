/**
 * Token Lifecycle Integration Tests
 * Tests the complete token lifecycle: create → associate → transfer
 */
import type { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { createToken } from '../../commands/create';
import { associateToken } from '../../commands/associate';
import { transferToken } from '../../commands/transfer';
import { ZustandTokenStateHelper } from '../../zustand-state-helper';
import { Status } from '../../../../core/shared/constants';
import {
  makeLogger,
  makeApiMocks,
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
    test('should handle create → associate → transfer flow', async () => {
      // Arrange
      const mockAddToken = jest.fn();
      const mockAddAssociation = jest.fn();
      const token = '0.0.123456';
      const _treasuryAccountId = '0.0.789012';
      const userAccountId = '0.0.345678';
      const treasuryKey = 'treasury-key';
      const userKey = 'user-key';

      mockZustandTokenStateHelper(MockedHelper, {
        addToken: mockAddToken,
        addAssociation: mockAddAssociation,
      });

      const mockTokenTransaction = { type: 'token-create' };
      const mockAssociationTransaction = { type: 'association' };
      const mockTransferTransaction = { type: 'transfer' };

      const {
        api,
        tokenTransactions: tokenTransactions,
        signing: _signing,
        kms: _credentials,
      } = makeApiMocks({
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
          signAndExecuteWith: jest
            .fn()
            .mockImplementation((transaction, _key) => {
              // Mock different responses based on transaction type
              if (transaction === mockTokenTransaction) {
                return Promise.resolve({
                  success: true,
                  transactionId: `${token}@1234567890.123456789`,
                  tokenId: token,
                  receipt: {
                    status: {
                      status: 'success',
                      transactionId: `${token}@1234567890.123456789`,
                    },
                  },
                });
              }
              if (transaction === mockAssociationTransaction) {
                return Promise.resolve({
                  success: true,
                  transactionId: '0.0.123@1234567890.123456790',
                  receipt: {
                    status: {
                      status: 'success',
                      transactionId: '0.0.123@1234567890.123456790',
                    },
                  },
                });
              }
              if (transaction === mockTransferTransaction) {
                return Promise.resolve({
                  success: true,
                  transactionId: '0.0.123@1234567890.123456791',
                  receipt: {
                    status: {
                      status: 'success',
                      transactionId: '0.0.123@1234567890.123456791',
                    },
                  },
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
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias, type) => {
            // Mock key alias resolution for test keys
            if (type === 'key' && alias === 'admin-key') {
              return {
                keyRefId: 'admin-key-ref-id',
                publicKey: 'admin-key',
              };
            }
            return null;
          }),
        },
      });

      const logger = makeLogger();

      // Act - Step 1: Create Token
      const createArgs: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          decimals: 2,
          initialSupply: '1000',
          maxSupply: '1000',
          supplyType: 'FINITE',
          treasury: `${_treasuryAccountId}:${treasuryKey}`,
          adminKey: 'admin-key',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      const createResult = await createToken(createArgs);

      // ADR-003 compliance: check CommandExecutionResult
      expect(createResult).toBeDefined();
      expect(createResult.status).toBe(Status.Success);
      expect(createResult.outputJson).toBeDefined();
      expect(createResult.errorMessage).toBeUndefined();

      // Act - Step 2: Associate Token
      const associateArgs: CommandHandlerArgs = {
        args: {
          token,
          account: `${userAccountId}:${userKey}`,
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      const associateResult = await associateToken(associateArgs);

      // ADR-003 compliance: check CommandExecutionResult
      expect(associateResult).toBeDefined();
      expect(associateResult.status).toBe(Status.Success);
      expect(associateResult.outputJson).toBeDefined();
      expect(associateResult.errorMessage).toBeUndefined();

      // Act - Step 3: Transfer Token
      const transferArgs: CommandHandlerArgs = {
        args: {
          token,
          from: `${_treasuryAccountId}:${treasuryKey}`,
          to: userAccountId,
          balance: 100,
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      const transferResult = await transferToken(transferArgs);

      // ADR-003 compliance: check CommandExecutionResult
      expect(transferResult).toBeDefined();
      expect(transferResult.status).toBe(Status.Success);
      expect(transferResult.outputJson).toBeDefined();
      expect(transferResult.errorMessage).toBeUndefined();

      // Assert - Verify all operations were called correctly
      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalledWith({
        name: 'TestToken',
        symbol: 'TEST',
        decimals: 2,
        initialSupplyRaw: 100000,
        supplyType: 'FINITE',
        maxSupplyRaw: 100000,
        treasuryId: _treasuryAccountId,
        adminKey: 'admin-key',
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
        amount: 10000,
      });

      // These operations will not succeed due to process.exit(1), so we can't verify the success calls
      // The important thing is that the transactions were created and attempted
      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalled();
      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalled();
      expect(tokenTransactions.createTransferTransaction).toHaveBeenCalled();
    });

    test('should handle partial failure in lifecycle', async () => {
      // Arrange
      const mockAddToken = jest.fn();
      const token = '0.0.123456';
      const userAccountId = '0.0.345678';
      const treasuryKey = 'treasury-key';
      const userKey = 'user-key';

      mockZustandTokenStateHelper(MockedHelper, {
        addToken: mockAddToken,
        addAssociation: jest.fn(),
      });

      const mockTokenTransaction = { type: 'token-create' };
      const mockAssociationTransaction = { type: 'association' };

      const {
        api,
        tokenTransactions: tokenTransactions,
        signing: _signing,
        kms: _credentials,
      } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest
            .fn()
            .mockReturnValue(mockTokenTransaction),
          createTokenAssociationTransaction: jest
            .fn()
            .mockReturnValue(mockAssociationTransaction),
        },
        signing: {
          signAndExecuteWith: jest
            .fn()
            .mockImplementation((transaction, _key) => {
              if (transaction === mockTokenTransaction) {
                return Promise.resolve({
                  success: true,
                  transactionId: `${token}@1234567890.123456789`,
                  tokenId: token,
                  receipt: {
                    status: {
                      status: 'success',
                      transactionId: `${token}@1234567890.123456789`,
                    },
                  },
                });
              }
              if (transaction === mockAssociationTransaction) {
                return Promise.resolve({
                  success: true,
                  transactionId: '0.0.123@1234567890.123456790',
                  receipt: {
                    status: {
                      status: 'success',
                      transactionId: '0.0.123@1234567890.123456790',
                    },
                  },
                });
              }
              return Promise.resolve({
                success: false,
                transactionId: '',
                receipt: { status: { status: 'failed', transactionId: '' } },
              });
            }),
        },
        alias: {
          resolve: jest.fn().mockImplementation((alias, type) => {
            // Mock key alias resolution for test keys
            if (type === 'key' && alias === 'admin-key') {
              return {
                keyRefId: 'admin-key-ref-id',
                publicKey: 'admin-key',
              };
            }
            return null;
          }),
        },
      });

      const logger = makeLogger();

      // Act - Step 1: Create Token (success)
      const createArgs: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          treasuryKey,
          adminKey: 'admin-key',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      const createResult = await createToken(createArgs);

      // ADR-003 compliance: check CommandExecutionResult
      expect(createResult).toBeDefined();
      expect(createResult.status).toBe(Status.Success);
      expect(createResult.outputJson).toBeDefined();
      expect(createResult.errorMessage).toBeUndefined();

      // Act - Step 2: Associate Token (success)
      const associateArgs: CommandHandlerArgs = {
        args: {
          token,
          account: `${userAccountId}:${userKey}`,
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      const associateResult = await associateToken(associateArgs);

      // ADR-003 compliance: check CommandExecutionResult
      expect(associateResult).toBeDefined();
      expect(associateResult.status).toBe(Status.Success);
      expect(associateResult.outputJson).toBeDefined();
      expect(associateResult.errorMessage).toBeUndefined();

      // Assert - Operations were attempted but failed due to process.exit(1)
      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalled();
      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalled();
    });

    test('should handle multiple associations for same token', async () => {
      // Arrange
      const mockAddToken = jest.fn();
      const mockAddAssociation = jest.fn();
      const token = '0.0.123456';
      const userAccountId1 = '0.0.345678';
      const userAccountId2 = '0.0.456789';
      const treasuryKey = 'treasury-key';
      const userKey1 = 'user-key-1';
      const userKey2 = 'user-key-2';

      mockZustandTokenStateHelper(MockedHelper, {
        addToken: mockAddToken,
        addAssociation: mockAddAssociation,
      });

      const mockTokenTransaction = { type: 'token-create' };
      const mockAssociationTransaction1 = { type: 'association-1' };
      const mockAssociationTransaction2 = { type: 'association-2' };

      const {
        api,
        tokenTransactions: tokenTransactions,
        signing: _signing,
        kms: _credentials,
      } = makeApiMocks({
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
                success: true,
                transactionId: '0.0.123@1234567890.123456789',
                receipt: {},
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
        alias: {
          resolve: jest.fn().mockImplementation((alias, type) => {
            // Mock key alias resolution for test keys
            if (type === 'key' && alias === 'admin-key') {
              return {
                keyRefId: 'admin-key-ref-id',
                publicKey: 'admin-key',
              };
            }
            return null;
          }),
        },
      });

      const logger = makeLogger();

      // Act - Step 1: Create Token
      const createArgs: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          treasuryKey,
          adminKey: 'admin-key',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      const createResult = await createToken(createArgs);

      // ADR-003 compliance: check CommandExecutionResult
      expect(createResult).toBeDefined();
      expect(createResult.status).toBe(Status.Success);
      expect(createResult.outputJson).toBeDefined();
      expect(createResult.errorMessage).toBeUndefined();

      // Act - Step 2: Associate with first user
      const associateArgs1: CommandHandlerArgs = {
        args: {
          token,
          account: `${userAccountId1}:${userKey1}`,
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      const associateResult1 = await associateToken(associateArgs1);

      // ADR-003 compliance: check CommandExecutionResult
      expect(associateResult1).toBeDefined();
      expect(associateResult1.status).toBe('success');
      expect(associateResult1.outputJson).toBeDefined();
      expect(associateResult1.errorMessage).toBeUndefined();

      // Act - Step 3: Associate with second user
      const associateArgs2: CommandHandlerArgs = {
        args: {
          token,
          account: `${userAccountId2}:${userKey2}`,
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      const associateResult2 = await associateToken(associateArgs2);

      // ADR-003 compliance: check CommandExecutionResult
      expect(associateResult2).toBeDefined();
      expect(associateResult2.status).toBe('success');
      expect(associateResult2.outputJson).toBeDefined();
      expect(associateResult2.errorMessage).toBeUndefined();

      // Assert - Operations were attempted
      expect(tokenTransactions.createTokenTransaction).toHaveBeenCalled();
      expect(
        tokenTransactions.createTokenAssociationTransaction,
      ).toHaveBeenCalled();
    });
  });

  describe('state consistency', () => {
    test('should maintain consistent state across operations', async () => {
      // Arrange
      const mockAddToken = jest.fn();
      const mockAddAssociation = jest.fn();
      const token = '0.0.123456';
      const userAccountId = '0.0.345678';

      const stateHelper = {
        addToken: mockAddToken,
        addAssociation: mockAddAssociation,
      };

      MockedHelper.mockImplementation(() => stateHelper);

      const {
        api,
        tokenTransactions: _tokenTransactions,
        signing: _signing,
        kms: _credentials,
      } = makeApiMocks({
        tokenTransactions: {
          createTokenTransaction: jest.fn().mockReturnValue({}),
          createTokenAssociationTransaction: jest.fn().mockReturnValue({}),
        },
        signing: {
          signAndExecuteWith: jest.fn().mockReturnValue({
            success: true,
            transactionId: '0.0.123@1234567890.123456789',
            receipt: {},
          }),
        },
      });

      const logger = makeLogger();

      // Act - Execute operations
      const createArgs: CommandHandlerArgs = {
        args: {
          tokenName: 'TestToken',
          symbol: 'TEST',
          treasuryKey: 'treasury-key',
          adminKey: 'admin-key',
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      const createResult = await createToken(createArgs);

      // ADR-003 compliance: check CommandExecutionResult
      expect(createResult).toBeDefined();
      expect(createResult.status).toBe(Status.Failure);
      expect(createResult.errorMessage).toBeDefined();
      expect(createResult.outputJson).toBeUndefined();

      const associateArgs: CommandHandlerArgs = {
        args: {
          token,
          account: `${userAccountId}:user-key`,
        },
        api,
        state: {} as any,
        config: {} as any,
        logger,
      };

      const associateResult = await associateToken(associateArgs);

      // ADR-003 compliance: check CommandExecutionResult
      expect(associateResult).toBeDefined();
      expect(associateResult.status).toBe(Status.Failure);
      expect(associateResult.errorMessage).toBeDefined();
      expect(associateResult.outputJson).toBeUndefined();

      // Assert - Verify state helper was initialized consistently
      expect(MockedHelper).toHaveBeenCalledTimes(2);
      expect(MockedHelper).toHaveBeenNthCalledWith(1, api.state, logger);
      expect(MockedHelper).toHaveBeenNthCalledWith(2, api.state, logger);

      // State helper was initialized for both operations
      expect(MockedHelper).toHaveBeenCalledTimes(2);
    });
  });
});

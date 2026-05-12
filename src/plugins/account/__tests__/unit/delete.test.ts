import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type { TransactionResult } from '@/core/types/shared.types';

import {
  makeAliasMock,
  makeConfigMock,
  makeStateMock,
} from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { InternalError, NotFoundError } from '@/core/errors';
import { AliasType, SupportedNetwork } from '@/core/types/shared.types';
import { AccountDeleteOutputSchema } from '@/plugins/account/commands/delete';
import { accountDelete } from '@/plugins/account/commands/delete/handler';
import { AccountDeleteInputSchema } from '@/plugins/account/commands/delete/input';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

import {
  mockAliasLists,
  mockAliasRecords,
  mockTransactionResults,
} from './helpers/fixtures';
import {
  makeAccountData,
  makeAliasServiceMock,
  makeApiMocksForAccountDelete,
  makeArgs,
  makeLogger,
  makeNetworkServiceMock,
  mockIdentityResolution,
} from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandAccountStateHelper: jest.fn(),
}));

const MockedHelper = ZustandAccountStateHelper as jest.Mock;

describe('account plugin - delete command (ADR-003)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AccountDeleteInputSchema', () => {
    it('requires transfer-id when deleting on Hedera', () => {
      expect(() =>
        AccountDeleteInputSchema.parse({
          account: '0.0.1',
          stateOnly: false,
        }),
      ).toThrow('transfer-id is required');
    });

    it('forbids transfer-id with state-only', () => {
      expect(() =>
        AccountDeleteInputSchema.parse({
          account: '0.0.1',
          transferId: '0.0.2',
          stateOnly: true,
        }),
      ).toThrow('transfer-id cannot be used with --state-only');
    });

    it('allows state-only without transfer-id', () => {
      const parsed = AccountDeleteInputSchema.parse({
        account: '0.0.1',
        stateOnly: true,
      });
      expect(parsed.stateOnly).toBe(true);
      expect(parsed.transferId).toBeUndefined();
    });
  });

  describe('state-only (local state)', () => {
    test('deletes account successfully by name', async () => {
      const logger = makeLogger();
      const account = makeAccountData({ name: 'acc1', accountId: '0.0.1111' });

      const accountDeleteMock = jest.fn().mockReturnValue(undefined);
      MockedHelper.mockImplementation(() => ({
        getAccount: jest.fn().mockReturnValue(account),
        listAccounts: jest.fn().mockReturnValue([]),
        deleteAccount: accountDeleteMock,
      }));
      const alias = makeAliasMock();
      alias.resolveOrThrow = jest.fn().mockReturnValue({
        alias: 'acc1',
        entityId: '0.0.1111',
      });
      alias.list = jest.fn().mockReturnValue([]);
      const network = makeNetworkServiceMock(SupportedNetwork.TESTNET);
      const kms = { remove: jest.fn() };

      const api: Partial<CoreApi> = {
        state: makeStateMock(),
        logger,
        alias,
        network,
        kms: kms as unknown as KmsService,
        identityResolution: mockIdentityResolution('0.0.1111'),
      };
      const args = makeArgs(api, logger, {
        account: 'acc1',
        stateOnly: true,
      });

      const result = await accountDelete(args);

      expect(accountDeleteMock).toHaveBeenCalledWith('testnet:0.0.1111');
      const output = assertOutput(result.result, AccountDeleteOutputSchema);
      expect(output.deletedAccount.name).toBe('acc1');
      expect(output.deletedAccount.accountId).toBe('0.0.1111');
      expect(output.stateOnly).toBe(true);
      expect(output.transactionId).toBeUndefined();
    });

    test('deletes account successfully by id', async () => {
      const logger = makeLogger();
      const account = makeAccountData({ name: 'acc2', accountId: '0.0.2222' });

      const accountDeleteMock = jest.fn().mockReturnValue(undefined);
      MockedHelper.mockImplementation(() => ({
        getAccount: jest.fn().mockReturnValue(account),
        listAccounts: jest.fn().mockReturnValue([account]),
        deleteAccount: accountDeleteMock,
      }));

      const alias = makeAliasServiceMock();
      const network = makeNetworkServiceMock(SupportedNetwork.TESTNET);
      const kms = { remove: jest.fn() };

      const api: Partial<CoreApi> = {
        state: makeStateMock(),
        logger,
        alias,
        network,
        kms: kms as unknown as KmsService,
        identityResolution: mockIdentityResolution('0.0.2222'),
      };
      const args = makeArgs(api, logger, {
        account: '0.0.2222',
        stateOnly: true,
      });

      const result = await accountDelete(args);

      expect(accountDeleteMock).toHaveBeenCalledWith('testnet:0.0.2222');
      const output = assertOutput(result.result, AccountDeleteOutputSchema);
      expect(output.deletedAccount.name).toBe('acc2');
      expect(output.deletedAccount.accountId).toBe('0.0.2222');
      expect(output.stateOnly).toBe(true);
    });

    test('returns failure when account param is missing', async () => {
      const logger = makeLogger();

      MockedHelper.mockImplementation(() => ({
        getAccount: jest.fn().mockReturnValue(null),
        listAccounts: jest.fn().mockReturnValue([]),
        deleteAccount: jest.fn(),
      }));

      const alias = makeAliasServiceMock();
      const network = makeNetworkServiceMock(SupportedNetwork.TESTNET);

      const api: Partial<CoreApi> = {
        state: makeStateMock(),
        logger,
        alias,
        network,
        identityResolution: mockIdentityResolution('0.0.1'),
      };
      const args = makeArgs(api, logger, { stateOnly: true });

      await expect(accountDelete(args)).rejects.toThrow();
    });

    test('throws error when account with given name not found', async () => {
      const logger = makeLogger();

      MockedHelper.mockImplementation(() => ({
        getAccount: jest.fn().mockReturnValue(null),
        listAccounts: jest.fn(),
        deleteAccount: jest.fn(),
      }));

      const alias = makeAliasServiceMock();
      alias.resolveOrThrow = jest.fn().mockReturnValue({
        alias: 'acc1',
        entityId: '0.0.1111',
      });
      alias.list = jest.fn().mockReturnValue([]);
      const network = makeNetworkServiceMock(SupportedNetwork.TESTNET);

      const api: Partial<CoreApi> = {
        state: makeStateMock(),
        logger,
        alias,
        network,
        identityResolution: mockIdentityResolution('0.0.1111'),
      };
      const args = makeArgs(api, logger, {
        account: 'missingAcc',
        stateOnly: true,
      });

      await expect(accountDelete(args)).rejects.toThrow(NotFoundError);
    });

    test('throws error when account with given id not found', async () => {
      const logger = makeLogger();

      MockedHelper.mockImplementation(() => ({
        getAccount: jest.fn().mockReturnValue(null),
        listAccounts: jest
          .fn()
          .mockReturnValue([makeAccountData({ accountId: '0.0.3333' })]),
        deleteAccount: jest.fn(),
      }));

      const alias = makeAliasServiceMock();
      const network = makeNetworkServiceMock(SupportedNetwork.TESTNET);

      const api: Partial<CoreApi> = {
        state: makeStateMock(),
        logger,
        alias,
        network,
        identityResolution: mockIdentityResolution('0.0.4444'),
      };
      const args = makeArgs(api, logger, {
        account: '0.0.4444',
        stateOnly: true,
      });

      await expect(accountDelete(args)).rejects.toThrow(NotFoundError);
    });

    test('throws error when accountDelete fails', async () => {
      const logger = makeLogger();
      const account = makeAccountData({ name: 'acc5', accountId: '0.0.5555' });

      MockedHelper.mockImplementation(() => ({
        getAccount: jest.fn().mockReturnValue(account),
        listAccounts: jest.fn(),
        deleteAccount: jest.fn().mockImplementation(() => {
          throw new InternalError('db error');
        }),
      }));

      const alias = makeAliasServiceMock();
      alias.resolveOrThrow = jest.fn().mockReturnValue({
        alias: 'acc5',
        entityId: '0.0.5555',
      });
      alias.list = jest.fn().mockReturnValue([]);
      const network = makeNetworkServiceMock(SupportedNetwork.TESTNET);

      const api: Partial<CoreApi> = {
        state: makeStateMock(),
        logger,
        alias,
        network,
        identityResolution: mockIdentityResolution('0.0.5555'),
      };
      const args = makeArgs(api, logger, {
        account: 'acc5',
        stateOnly: true,
      });

      await expect(accountDelete(args)).rejects.toThrow();
    });

    test('removes aliases of the account only for current network and type', async () => {
      const logger = makeLogger();
      const account = makeAccountData({
        name: 'acc-alias',
        accountId: '0.0.7777',
      });

      MockedHelper.mockImplementation(() => ({
        getAccount: jest.fn().mockReturnValue(account),
        listAccounts: jest.fn().mockReturnValue([]),
        deleteAccount: jest.fn(),
      }));

      const alias = makeAliasServiceMock({
        records: mockAliasLists.multiNetworkMultiType,
      });
      alias.resolveOrThrow = jest.fn().mockReturnValue({
        alias: 'acc-alias',
        entityId: '0.0.7777',
      });
      const network = makeNetworkServiceMock(SupportedNetwork.TESTNET);
      const kms = { remove: jest.fn() };

      const api: Partial<CoreApi> = {
        state: makeStateMock(),
        logger,
        alias,
        network,
        kms: kms as unknown as KmsService,
        identityResolution: mockIdentityResolution('0.0.7777'),
      };
      const args = makeArgs(api, logger, {
        account: 'acc-alias',
        stateOnly: true,
      });

      const result = await accountDelete(args);

      expect(alias.list).toHaveBeenCalledWith({
        network: SupportedNetwork.TESTNET,
        type: AliasType.Account,
      });

      expect(alias.remove).toHaveBeenCalledTimes(1);
      expect(alias.remove).toHaveBeenCalledWith(
        mockAliasRecords.accountTestnet.alias,
        SupportedNetwork.TESTNET,
      );

      expect(alias.remove).not.toHaveBeenCalledWith(
        mockAliasRecords.accountMainnet.alias,
        SupportedNetwork.MAINNET,
      );
      expect(alias.remove).not.toHaveBeenCalledWith(
        mockAliasRecords.tokenTestnet.alias,
        SupportedNetwork.TESTNET,
      );
      expect(alias.remove).not.toHaveBeenCalledWith(
        mockAliasRecords.otherAccountTestnet.alias,
        SupportedNetwork.TESTNET,
      );

      const output = assertOutput(result.result, AccountDeleteOutputSchema);
      expect(output.deletedAccount.name).toBe('acc-alias');
      expect(output.deletedAccount.accountId).toBe('0.0.7777');
      expect(output.removedAliases).toBeDefined();
      expect(output.removedAliases).toHaveLength(1);
      expect(output.removedAliases![0]).toBe(
        `${mockAliasRecords.accountTestnet.alias} (${SupportedNetwork.TESTNET})`,
      );
    });
  });

  describe('network delete (AccountDeleteTransaction)', () => {
    test('deletes on network: builds tx, signs, executes, and clears state', async () => {
      const logger = makeLogger();
      const account = makeAccountData({
        name: 'net-del',
        accountId: '0.0.1111',
        keyRefId: 'kr_deleted',
      });

      const deleteAccountImpl = jest.fn().mockReturnValue({
        transaction: { _tag: 'AccountDeleteTx' },
      });
      const executeResult = {
        ...mockTransactionResults.success,
        consensusTimestamp: '2024-01-01T00:00:00.000Z',
      } as TransactionResult;

      const {
        account: accountSvc,
        txSign,
        txExecute,
        networkMock,
        kms,
        alias,
        keyResolver,
      } = makeApiMocksForAccountDelete({
        deleteAccountImpl,
        executeImpl: jest.fn().mockResolvedValue(executeResult),
      });

      const stateDeleteMock = jest.fn();
      MockedHelper.mockImplementation(() => ({
        getAccount: jest.fn().mockReturnValue(account),
        listAccounts: jest.fn().mockReturnValue([]),
        deleteAccount: stateDeleteMock,
      }));

      alias.resolveOrThrow = jest.fn().mockReturnValue({
        alias: 'net-del',
        entityId: '0.0.1111',
      });
      alias.list = jest.fn().mockReturnValue([]);

      const api: Partial<CoreApi> = {
        state: makeStateMock(),
        logger,
        alias,
        network: networkMock,
        kms: kms as unknown as KmsService,
        account: accountSvc,
        txSign,
        txExecute,
        keyResolver,
        config: makeConfigMock(),
        identityResolution: mockIdentityResolution('0.0.1111'),
      };

      const args = makeArgs(api, logger, {
        account: 'net-del',
        transferId: '0.0.9999',
        stateOnly: false,
      });

      const result = await accountDelete(args);

      expect(deleteAccountImpl).toHaveBeenCalledWith({
        accountId: '0.0.1111',
        transferAccountId: '0.0.9999',
      });
      expect(txSign.sign).toHaveBeenCalledWith({ _tag: 'AccountDeleteTx' }, [
        'kr_deleted',
      ]);
      expect(txExecute.execute).toHaveBeenCalled();
      expect(stateDeleteMock).toHaveBeenCalledWith('testnet:0.0.1111');

      const output = assertOutput(result.result, AccountDeleteOutputSchema);
      expect(output.stateOnly).toBe(false);
      expect(output.transactionId).toBe(
        mockTransactionResults.success.transactionId,
      );
      expect(output.deletedAccount.accountId).toBe('0.0.1111');
    });

    test('throws TransactionError when execute returns failure', async () => {
      const logger = makeLogger();
      const account = makeAccountData({ accountId: '0.0.1111' });

      const {
        account: accountSvc,
        txSign,
        txExecute,
        networkMock,
        kms,
        alias,
        keyResolver,
      } = makeApiMocksForAccountDelete({
        executeImpl: jest.fn().mockResolvedValue({
          ...mockTransactionResults.failure,
          consensusTimestamp: '2024-01-01T00:00:00.000Z',
        } as TransactionResult),
      });

      MockedHelper.mockImplementation(() => ({
        getAccount: jest.fn().mockReturnValue(account),
        listAccounts: jest.fn().mockReturnValue([]),
        deleteAccount: jest.fn(),
      }));

      alias.list = jest.fn().mockReturnValue([]);

      const api: Partial<CoreApi> = {
        state: makeStateMock(),
        logger,
        alias,
        network: networkMock,
        kms: kms as unknown as KmsService,
        account: accountSvc,
        txSign,
        txExecute,
        keyResolver,
        config: makeConfigMock(),
        identityResolution: mockIdentityResolution('0.0.1111'),
      };

      const args = makeArgs(api, logger, {
        account: '0.0.1111',
        transferId: '0.0.9999',
      });

      await expect(accountDelete(args)).rejects.toThrow(
        'Failed to delete account',
      );
    });
  });
});

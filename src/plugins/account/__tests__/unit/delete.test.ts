import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { KmsService } from '@/core/services/kms/kms-service.interface';

import { makeAliasMock, makeStateMock } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { InternalError, NotFoundError } from '@/core/errors';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { SupportedNetwork } from '@/core/types/shared.types';
import { DeleteAccountOutputSchema } from '@/plugins/account/commands/delete';
import { deleteAccount } from '@/plugins/account/commands/delete/handler';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

import { mockAliasLists, mockAliasRecords } from './helpers/fixtures';
import {
  makeAccountData,
  makeAliasServiceMock,
  makeArgs,
  makeLogger,
  makeNetworkServiceMock,
} from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandAccountStateHelper: jest.fn(),
}));

const MockedHelper = ZustandAccountStateHelper as jest.Mock;

describe('account plugin - delete command (ADR-003)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deletes account successfully by name', async () => {
    const logger = makeLogger();
    const account = makeAccountData({ name: 'acc1', accountId: '0.0.1111' });

    const deleteAccountMock = jest.fn().mockReturnValue(undefined);
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(account),
      listAccounts: jest.fn().mockReturnValue([]),
      deleteAccount: deleteAccountMock,
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
    };
    const args = makeArgs(api, logger, { account: 'acc1' });

    const result = await deleteAccount(args);

    expect(deleteAccountMock).toHaveBeenCalledWith('testnet:0.0.1111');
    const output = assertOutput(result.result, DeleteAccountOutputSchema);
    expect(output.deletedAccount.name).toBe('acc1');
    expect(output.deletedAccount.accountId).toBe('0.0.1111');
  });

  test('deletes account successfully by id', async () => {
    const logger = makeLogger();
    const account = makeAccountData({ name: 'acc2', accountId: '0.0.2222' });

    const deleteAccountMock = jest.fn().mockReturnValue(undefined);
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(account),
      listAccounts: jest.fn().mockReturnValue([account]),
      deleteAccount: deleteAccountMock,
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
    };
    const args = makeArgs(api, logger, { account: '0.0.2222' });

    const result = await deleteAccount(args);

    expect(deleteAccountMock).toHaveBeenCalledWith('testnet:0.0.2222');
    const output = assertOutput(result.result, DeleteAccountOutputSchema);
    expect(output.deletedAccount.name).toBe('acc2');
    expect(output.deletedAccount.accountId).toBe('0.0.2222');
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
    };
    const args = makeArgs(api, logger, {});

    await expect(deleteAccount(args)).rejects.toThrow();
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
    };
    const args = makeArgs(api, logger, { account: 'missingAcc' });

    await expect(deleteAccount(args)).rejects.toThrow(NotFoundError);
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
    };
    const args = makeArgs(api, logger, { account: '0.0.4444' });

    await expect(deleteAccount(args)).rejects.toThrow(NotFoundError);
  });

  test('throws error when deleteAccount fails', async () => {
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
    };
    const args = makeArgs(api, logger, { account: 'acc5' });

    await expect(deleteAccount(args)).rejects.toThrow();
  });

  test('removes aliases of the account only for current network and type', async () => {
    const logger = makeLogger();
    const account = makeAccountData({
      name: 'acc-alias',
      accountId: '0.0.7777',
    });

    // Mock account state helper
    MockedHelper.mockImplementation(() => ({
      getAccount: jest.fn().mockReturnValue(account),
      listAccounts: jest.fn().mockReturnValue([]),
      deleteAccount: jest.fn(),
    }));

    // Setup alias and network mocks via dedicated helpers
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
    };
    const args = makeArgs(api, logger, { account: 'acc-alias' });

    const result = await deleteAccount(args);

    expect(alias.list).toHaveBeenCalledWith({
      network: SupportedNetwork.TESTNET,
      type: ALIAS_TYPE.Account,
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

    // Verify ADR-003 result
    const output = assertOutput(result.result, DeleteAccountOutputSchema);
    expect(output.deletedAccount.name).toBe('acc-alias');
    expect(output.deletedAccount.accountId).toBe('0.0.7777');
    expect(output.removedAliases).toBeDefined();
    expect(output.removedAliases).toHaveLength(1);
    expect(output.removedAliases![0]).toBe(
      `${mockAliasRecords.accountTestnet.alias} (${SupportedNetwork.TESTNET})`,
    );
  });
});

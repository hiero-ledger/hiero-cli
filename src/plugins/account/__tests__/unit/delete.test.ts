import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { KmsService } from '@/core/services/kms/kms-service.interface';
import type { DeleteAccountOutput } from '@/plugins/account/commands/delete';

import { makeStateMock } from '@/__tests__/mocks/mocks';
import { NotFoundError } from '@/core/errors';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { SupportedNetwork } from '@/core/types/shared.types';
import { deleteAccount } from '@/plugins/account/commands/delete/handler';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

import { mockAliasLists } from './helpers/fixtures';
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
      loadAccount: jest.fn().mockReturnValue(account),
      listAccounts: jest.fn().mockReturnValue([]),
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
    const args = makeArgs(api, logger, { name: 'acc1' });

    const result = await deleteAccount(args);

    expect(deleteAccountMock).toHaveBeenCalledWith('acc1');
    const output = result.result as DeleteAccountOutput;
    expect(output.deletedAccount.name).toBe('acc1');
    expect(output.deletedAccount.accountId).toBe('0.0.1111');
  });

  test('deletes account successfully by id', async () => {
    const logger = makeLogger();
    const account = makeAccountData({ name: 'acc2', accountId: '0.0.2222' });

    const deleteAccountMock = jest.fn().mockReturnValue(undefined);
    MockedHelper.mockImplementation(() => ({
      loadAccount: jest.fn(),
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
    const args = makeArgs(api, logger, { id: '0.0.2222' });

    const result = await deleteAccount(args);

    expect(deleteAccountMock).toHaveBeenCalledWith('acc2');
    const output = result.result as DeleteAccountOutput;
    expect(output.deletedAccount.name).toBe('acc2');
    expect(output.deletedAccount.accountId).toBe('0.0.2222');
  });

  test('returns failure when no name or id provided', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      loadAccount: jest.fn().mockReturnValue(null),
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
    const args = makeArgs(api, logger, { name: 'nonexistent' });

    await expect(deleteAccount(args)).rejects.toThrow();
  });

  test('throws error when account with given name not found', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      loadAccount: jest.fn().mockReturnValue(null),
      listAccounts: jest.fn(),
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
    const args = makeArgs(api, logger, { name: 'missingAcc' });

    await expect(deleteAccount(args)).rejects.toThrow(NotFoundError);
  });

  test('throws error when account with given id not found', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      loadAccount: jest.fn(),
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
    const args = makeArgs(api, logger, { id: '0.0.4444' });

    await expect(deleteAccount(args)).rejects.toThrow(NotFoundError);
  });

  test('throws error when deleteAccount fails', async () => {
    const logger = makeLogger();
    const account = makeAccountData({ name: 'acc5', accountId: '0.0.5555' });

    MockedHelper.mockImplementation(() => ({
      loadAccount: jest.fn().mockReturnValue(account),
      listAccounts: jest.fn(),
      deleteAccount: jest.fn().mockImplementation(() => {
        throw new Error('db error');
      }),
    }));

    const alias = makeAliasServiceMock();
    const network = makeNetworkServiceMock(SupportedNetwork.TESTNET);

    const api: Partial<CoreApi> = {
      state: makeStateMock(),
      logger,
      alias,
      network,
    };
    const args = makeArgs(api, logger, { name: 'acc5' });

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
      loadAccount: jest.fn().mockReturnValue(account),
      listAccounts: jest.fn().mockReturnValue([]),
      deleteAccount: jest.fn(),
    }));

    // Setup alias and network mocks via dedicated helpers
    const alias = makeAliasServiceMock({
      records: mockAliasLists.multiNetworkMultiType,
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
    const args = makeArgs(api, logger, { name: 'acc-alias' });

    const result = await deleteAccount(args);

    // Ensure list was requested with the correct filters
    expect(alias.list).toHaveBeenCalledWith({
      network: 'testnet',
      type: ALIAS_TYPE.Account,
    });

    // Only the matching testnet+account type alias for the same entity should be removed
    expect(alias.remove).toHaveBeenCalledTimes(1);
    expect(alias.remove).toHaveBeenCalledWith('acc-alias-testnet', 'testnet');

    // Ensure non-matching ones are NOT removed
    expect(alias.remove).not.toHaveBeenCalledWith(
      'acc-alias-mainnet',
      'mainnet',
    );
    expect(alias.remove).not.toHaveBeenCalledWith(
      'token-alias-testnet',
      'testnet',
    );
    expect(alias.remove).not.toHaveBeenCalledWith(
      'other-acc-testnet',
      'testnet',
    );

    // Verify ADR-003 result
    const output = result.result as DeleteAccountOutput;
    expect(output.deletedAccount.name).toBe('acc-alias');
    expect(output.deletedAccount.accountId).toBe('0.0.7777');
    expect(output.removedAliases).toBeDefined();
    expect(output.removedAliases).toHaveLength(1);
    expect(output.removedAliases![0]).toBe('acc-alias-testnet (testnet)');
  });
});

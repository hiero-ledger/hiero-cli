import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { DeleteAccountOutput } from '@/plugins/account/commands/delete';

import { AliasType } from '@/core/services/alias/alias-service.interface';
import { Status } from '@/core/shared/constants';
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
    const network = makeNetworkServiceMock('testnet');
    const kms = { remove: jest.fn() };

    const api: Partial<CoreApi> = {
      state: {} as any,
      logger,
      alias,
      network,
      kms: kms as any,
    };
    const args = makeArgs(api, logger, { name: 'acc1' });

    const result = await deleteAccount(args);

    expect(deleteAccountMock).toHaveBeenCalledWith('acc1');
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: DeleteAccountOutput = JSON.parse(result.outputJson!);
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
    const network = makeNetworkServiceMock('testnet');
    const kms = { remove: jest.fn() };

    const api: Partial<CoreApi> = {
      state: {} as any,
      logger,
      alias,
      network,
      kms: kms as any,
    };
    const args = makeArgs(api, logger, { id: '0.0.2222' });

    const result = await deleteAccount(args);

    expect(deleteAccountMock).toHaveBeenCalledWith('acc2');
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: DeleteAccountOutput = JSON.parse(result.outputJson!);
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
    const network = makeNetworkServiceMock('testnet');

    const api: Partial<CoreApi> = {
      state: {} as any,
      logger,
      alias,
      network,
    };
    const args = makeArgs(api, logger, { name: 'nonexistent' });

    const result = await deleteAccount(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
  });

  test('returns failure when account with given name not found', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      loadAccount: jest.fn().mockReturnValue(null),
      listAccounts: jest.fn(),
      deleteAccount: jest.fn(),
    }));

    const alias = makeAliasServiceMock();
    const network = makeNetworkServiceMock('testnet');

    const api: Partial<CoreApi> = {
      state: {} as any,
      logger,
      alias,
      network,
    };
    const args = makeArgs(api, logger, { name: 'missingAcc' });

    const result = await deleteAccount(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain(
      "Account with name 'missingAcc' not found",
    );
  });

  test('returns failure when account with given id not found', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      loadAccount: jest.fn(),
      listAccounts: jest
        .fn()
        .mockReturnValue([makeAccountData({ accountId: '0.0.3333' })]),
      deleteAccount: jest.fn(),
    }));

    const alias = makeAliasServiceMock();
    const network = makeNetworkServiceMock('testnet');

    const api: Partial<CoreApi> = {
      state: {} as any,
      logger,
      alias,
      network,
    };
    const args = makeArgs(api, logger, { id: '0.0.4444' });

    const result = await deleteAccount(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain(
      "Account with ID '0.0.4444' not found",
    );
  });

  test('returns failure when deleteAccount throws', async () => {
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
    const network = makeNetworkServiceMock('testnet');

    const api: Partial<CoreApi> = {
      state: {} as any,
      logger,
      alias,
      network,
    };
    const args = makeArgs(api, logger, { name: 'acc5' });

    const result = await deleteAccount(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain('Failed to delete account');
    expect(result.errorMessage).toContain('db error');
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
    const network = makeNetworkServiceMock('testnet');
    const kms = { remove: jest.fn() };

    const api: Partial<CoreApi> = {
      state: {} as any,
      logger,
      alias,
      network,
      kms: kms as any,
    };
    const args = makeArgs(api, logger, { name: 'acc-alias' });

    const result = await deleteAccount(args);

    // Ensure list was requested with the correct filters
    expect(alias.list).toHaveBeenCalledWith({
      network: 'testnet',
      type: AliasType.Account,
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
    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: DeleteAccountOutput = JSON.parse(result.outputJson!);
    expect(output.deletedAccount.name).toBe('acc-alias');
    expect(output.deletedAccount.accountId).toBe('0.0.7777');
    expect(output.removedAliases).toBeDefined();
    expect(output.removedAliases).toHaveLength(1);
    expect(output.removedAliases![0]).toBe('acc-alias-testnet (testnet)');
  });
});

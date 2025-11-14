import { listAccounts } from '../../commands/list/handler';
import type { ListAccountsOutput } from '../../commands/list';
import { ZustandAccountStateHelper } from '../../zustand-state-helper';
import type { CoreApi } from '../../../../core/core-api/core-api.interface';
import { Status } from '../../../../core/shared/constants';
import {
  makeLogger,
  makeArgs,
} from '../../../../core/shared/__tests__/helpers/mocks';
import { makeAccountData } from './helpers/mocks';

jest.mock('../../zustand-state-helper', () => ({
  ZustandAccountStateHelper: jest.fn(),
}));

const MockedHelper = ZustandAccountStateHelper as jest.Mock;

describe('account plugin - list command (ADR-003)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns success with empty accounts list when no accounts exist', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      listAccounts: jest.fn().mockReturnValue([]),
    }));

    const api: Partial<CoreApi> = { state: {} as any, logger };
    const args = makeArgs(api, logger, {});

    const result = await listAccounts(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: ListAccountsOutput = JSON.parse(result.outputJson!);
    expect(output.totalCount).toBe(0);
    expect(output.accounts).toEqual([]);
  });

  test('returns success with accounts list without private keys', async () => {
    const logger = makeLogger();
    const accounts = [
      makeAccountData({ name: 'acc1', accountId: '0.0.1111' }),
      makeAccountData({ name: 'acc2', accountId: '0.0.2222' }),
    ];

    MockedHelper.mockImplementation(() => ({
      listAccounts: jest.fn().mockReturnValue(accounts),
    }));

    const api: Partial<CoreApi> = { state: {} as any, logger };
    const args = makeArgs(api, logger, {});

    const result = await listAccounts(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: ListAccountsOutput = JSON.parse(result.outputJson!);
    expect(output.totalCount).toBe(2);
    expect(output.accounts).toHaveLength(2);
    expect(output.accounts[0].name).toBe('acc1');
    expect(output.accounts[0].accountId).toBe('0.0.1111');
    expect(output.accounts[0].keyRefId).toBeUndefined();
    expect(output.accounts[1].name).toBe('acc2');
    expect(output.accounts[1].accountId).toBe('0.0.2222');
    expect(output.accounts[1].keyRefId).toBeUndefined();
  });

  test('returns success with accounts including keyRefId when --private flag is set', async () => {
    const logger = makeLogger();
    const accounts = [makeAccountData({ name: 'acc3', accountId: '0.0.3333' })];

    MockedHelper.mockImplementation(() => ({
      listAccounts: jest.fn().mockReturnValue(accounts),
    }));

    const api: Partial<CoreApi> = { state: {} as any, logger };
    const args = makeArgs(api, logger, { private: true });

    const result = await listAccounts(args);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output: ListAccountsOutput = JSON.parse(result.outputJson!);
    expect(output.totalCount).toBe(1);
    expect(output.accounts).toHaveLength(1);
    expect(output.accounts[0].name).toBe('acc3');
    expect(output.accounts[0].accountId).toBe('0.0.3333');
    expect(output.accounts[0].keyRefId).toBeDefined();
    expect(output.accounts[0].keyRefId).toBe('kr_test123');
  });

  test('returns failure when listAccounts throws', async () => {
    const logger = makeLogger();

    MockedHelper.mockImplementation(() => ({
      listAccounts: jest.fn().mockImplementation(() => {
        throw new Error('db error');
      }),
    }));

    const api: Partial<CoreApi> = { state: {} as any, logger };
    const args = makeArgs(api, logger, {});

    const result = await listAccounts(args);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain('Failed to list accounts');
    expect(result.errorMessage).toContain('db error');
  });
});

import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { ClearAccountsOutput } from '@/plugins/account/commands/clear';

import { makeLogger, makeStateMock } from '@/__tests__/mocks/mocks';
import { validateOutputSchema } from '@/__tests__/shared/output-validation.helper';
import { Status } from '@/core/shared/constants';
import { ClearAccountsOutputSchema } from '@/plugins/account/commands/clear';
import { clearAccounts } from '@/plugins/account/commands/clear/handler';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

jest.mock('../../zustand-state-helper', () => ({
  ZustandAccountStateHelper: jest.fn(),
}));

const MockedHelper = ZustandAccountStateHelper as jest.Mock;

describe('account plugin - clear command (ADR-003)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('clears all accounts successfully', async () => {
    const logger = makeLogger();
    const alias = {
      clear: jest.fn(),
    };

    const listAccountsMock = jest
      .fn()
      .mockReturnValue([{ name: 'a' }, { name: 'b' }]);
    const clearAccountsMock = jest.fn().mockReturnValue(undefined);

    MockedHelper.mockImplementation(() => ({
      listAccounts: listAccountsMock,
      clearAccounts: clearAccountsMock,
    }));

    const args: Partial<CommandHandlerArgs> = {
      api: {
        state: makeStateMock(),
        alias,
      } as unknown as CoreApi,
      logger,
      args: {},
    };

    const result = await clearAccounts(args as CommandHandlerArgs);

    expect(MockedHelper).toHaveBeenCalledWith(args.api!.state, logger);
    expect(listAccountsMock).toHaveBeenCalledTimes(1);
    expect(clearAccountsMock).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('Clearing all accounts...');
    expect(alias.clear).toHaveBeenCalledTimes(1);

    expect(result.status).toBe(Status.Success);
    expect(result.outputJson).toBeDefined();

    const output = validateOutputSchema<ClearAccountsOutput>(
      result.outputJson!,
      ClearAccountsOutputSchema,
    );
    expect(output.clearedCount).toBe(2);
  });

  test('returns failure when clear fails', async () => {
    const logger = makeLogger();
    const alias = {
      clear: jest.fn(),
    };

    MockedHelper.mockImplementation(() => ({
      listAccounts: jest.fn().mockReturnValue([{ name: 'a' }]),
      clearAccounts: jest.fn().mockImplementation(() => {
        throw new Error('db error');
      }),
    }));

    const args: Partial<CommandHandlerArgs> = {
      api: {
        state: makeStateMock(),
        alias,
      } as unknown as CoreApi,
      logger,
      args: {},
    };

    const result = await clearAccounts(args as CommandHandlerArgs);

    expect(result.status).toBe(Status.Failure);
    expect(result.errorMessage).toBeDefined();
    expect(result.errorMessage).toContain('Failed to clear accounts');
    expect(result.errorMessage).toContain('db error');
  });
});

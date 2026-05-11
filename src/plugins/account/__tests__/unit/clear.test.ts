import type { CoreApi } from '@/core/core-api/core-api.interface';
import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';

import { makeLogger, makeStateMock } from '@/__tests__/mocks/mocks';
import { assertOutput } from '@/__tests__/utils/assert-output';
import { InternalError } from '@/core';
import { AccountClearOutputSchema } from '@/plugins/account/commands/clear';
import { accountClear } from '@/plugins/account/commands/clear/handler';
import { AccountStateServiceImpl } from '@/plugins/account/services/account-state.service';

jest.mock('../../services/account-state.service', () => ({
  AccountStateServiceImpl: jest.fn(),
}));

const MockedHelper = AccountStateServiceImpl as jest.Mock;

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
        logger,
      } as unknown as CoreApi,
      args: {},
    };

    const result = await accountClear(args as CommandHandlerArgs);

    expect(MockedHelper).toHaveBeenCalledWith(args.api!.state, logger);
    expect(listAccountsMock).toHaveBeenCalledTimes(1);
    expect(clearAccountsMock).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('Clearing all accounts...');
    expect(alias.clear).toHaveBeenCalledTimes(1);

    const output = assertOutput(result.result, AccountClearOutputSchema);
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
        throw new InternalError('db error');
      }),
    }));

    const args: Partial<CommandHandlerArgs> = {
      api: {
        state: makeStateMock(),
        alias,
        logger,
      } as unknown as CoreApi,
      args: {},
    };

    await expect(accountClear(args as CommandHandlerArgs)).rejects.toThrow();
  });
});

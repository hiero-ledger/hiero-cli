import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { MemoTestOutput } from './output';

import { NotFoundError, StateError } from '@/core/errors';
import { MemoTestInputSchema } from '@/plugins/test/commands/memo/input';
import { ZustandMemoStateHelper } from '@/plugins/test/zustand-state-helper';

export async function createMemo(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const memoState = new ZustandMemoStateHelper(api.state, logger);

  const validArgs = MemoTestInputSchema.parse(args.args);
  const memo = validArgs.memo;
  const accountAlias = validArgs.account;

  const currentNetwork = api.network.getCurrentNetwork();
  const account = api.alias.resolve(accountAlias, 'account', currentNetwork);

  if (!account) {
    throw new NotFoundError(
      `Failed to create memo for an account. Missing account in state ${accountAlias}`,
      { context: { accountAlias } },
    );
  }

  const existingMemo = memoState.getMemo(accountAlias);
  if (existingMemo) {
    throw new StateError(
      `Memo already existing for an account ${accountAlias}`,
      {
        context: { accountAlias },
      },
    );
  }

  const memoData = {
    account: account.alias,
    memo,
  };
  memoState.saveMemo(account.alias, memoData);

  const output: MemoTestOutput = {
    memo,
    account: account.alias,
  };

  return { result: output };
}

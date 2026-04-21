import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { TestMemoOutput } from './output';

import { NotFoundError, StateError } from '@/core/errors';
import { AliasType } from '@/core/types/shared.types';
import { TestMemoInputSchema } from '@/plugins/test/commands/memo/input';
import { ZustandMemoStateHelper } from '@/plugins/test/zustand-state-helper';

export async function testMemo(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const memoState = new ZustandMemoStateHelper(api.state, logger);

  const validArgs = TestMemoInputSchema.parse(args.args);
  const memo = validArgs.memo;
  const accountAlias = validArgs.account;

  const currentNetwork = api.network.getCurrentNetwork();
  const account = api.alias.resolve(
    accountAlias,
    AliasType.Account,
    currentNetwork,
  );

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

  const output: TestMemoOutput = {
    memo,
    account: account.alias,
  };

  return { result: output };
}

import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { CommandExecutionResult } from '@/core/plugins/plugin.types';
import type { MemoTestOutput } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { MemoTestInputSchema } from '@/plugins/test/commands/memo/input';
import { ZustandMemoStateHelper } from '@/plugins/test/zustand-state-helper';

export async function createMemo(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;
  const memoState = new ZustandMemoStateHelper(api.state, logger);
  try {
    // Parse and validate args
    const validArgs = MemoTestInputSchema.parse(args.args);
    const memo = validArgs.memo;
    const accountAlias = validArgs.account;
    const currentNetwork = api.network.getCurrentNetwork();
    const account = api.alias.resolve(accountAlias, 'account', currentNetwork);
    if (!account) {
      throw new Error(
        `Failed to create memo for an account. Missing account in state ${accountAlias}`,
      );
    }
    const existingMemo = memoState.getMemo(accountAlias);
    if (existingMemo) {
      throw new Error(`Memo already existing for an account ${accountAlias}`);
    }
    const memoData = {
      account: account.alias,
      memo: memo,
    };
    memoState.saveMemo(account.alias, memoData);
    const output: MemoTestOutput = {
      memo,
      account: account.alias,
    };
    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to list configuration options', error),
    };
  }
}

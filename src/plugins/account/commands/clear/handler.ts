import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { AccountClearOutput } from './output';

import { AliasType } from '@/core/services/alias/alias-service.interface';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

export class AccountClearCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const accountState = new ZustandAccountStateHelper(api.state, logger);

    logger.info('Clearing all accounts...');

    const accounts = accountState.listAccounts();
    const count = accounts.length;

    api.alias.clear(AliasType.Account);

    accountState.clearAccounts();

    const outputData: AccountClearOutput = {
      clearedCount: count,
    };

    return { result: outputData };
  }
}

export const accountClear = (args: CommandHandlerArgs) =>
  new AccountClearCommand().execute(args);

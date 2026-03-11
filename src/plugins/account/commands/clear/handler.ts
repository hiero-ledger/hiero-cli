import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ClearAccountsOutput } from './output';

import { AliasType } from '@/core/services/alias/alias-service.interface';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

export class ClearAccountsCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const accountState = new ZustandAccountStateHelper(api.state, logger);

    logger.info('Clearing all accounts...');

    const accounts = accountState.listAccounts();
    const count = accounts.length;

    api.alias.clear(AliasType.Account);

    accountState.clearAccounts();

    const outputData: ClearAccountsOutput = {
      clearedCount: count,
    };

    return { result: outputData };
  }
}

export const clearAccounts = (args: CommandHandlerArgs) =>
  new ClearAccountsCommand().execute(args);

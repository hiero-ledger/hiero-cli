import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { AccountStateService } from '@/plugins/account/services/account-state.service.interface';
import type { AccountClearOutput } from './output';

import { AliasType } from '@/core/types/shared.types';
import { AccountStateServiceImpl } from '@/plugins/account/services/account-state.service';

export class AccountClearCommand implements Command {
  constructor(private readonly accountState: AccountStateService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    api.logger.info('Clearing all accounts...');

    const accounts = this.accountState.listAccounts();
    const count = accounts.length;

    api.alias.clear(AliasType.Account);

    this.accountState.clearAccounts();

    const outputData: AccountClearOutput = {
      clearedCount: count,
    };

    return { result: outputData };
  }
}

export const accountClear = (args: CommandHandlerArgs) =>
  new AccountClearCommand(
    new AccountStateServiceImpl(args.api.state, args.api.logger),
  ).execute(args);

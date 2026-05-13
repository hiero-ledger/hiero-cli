import type { Command } from '@/core/commands/command.interface';
import type {
  CommandHandlerArgs,
  CommandResult,
} from '@/core/plugins/plugin.interface';
import type { AccountStateService } from '@/plugins/account/services/account-state.service.interface';
import type { AccountListOutput } from './output';

import { AccountStateServiceImpl } from '@/plugins/account/services/account-state.service';

import { AccountListInputSchema } from './input';

export class AccountListCommand implements Command {
  constructor(private readonly accountState: AccountStateService) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const validArgs = AccountListInputSchema.parse(args.args);

    const showPrivateKeys = validArgs.private;

    const { api } = args;
    api.logger.info('Listing all accounts...');

    const accounts = this.accountState.listAccounts();

    const outputData: AccountListOutput = {
      accounts: accounts.map((account) => ({
        name: account.name,
        accountId: account.accountId,
        type: account.type,
        network: account.network,
        evmAddress: account.evmAddress,
        ...(showPrivateKeys && { keyRefId: account.keyRefId }),
      })),
      totalCount: accounts.length,
    };

    return { result: outputData };
  }
}

export const accountList = (args: CommandHandlerArgs) =>
  new AccountListCommand(
    new AccountStateServiceImpl(args.api.state, args.api.logger),
  ).execute(args);

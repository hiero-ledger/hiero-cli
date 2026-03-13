import type { Command } from '@/core/commands/command.interface';
import type {
  CommandHandlerArgs,
  CommandResult,
} from '@/core/plugins/plugin.interface';
import type { AccountListOutput } from './output';

import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

import { AccountListInputSchema } from './input';

export class AccountListCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const accountState = new ZustandAccountStateHelper(api.state, logger);

    const validArgs = AccountListInputSchema.parse(args.args);

    const showPrivateKeys = validArgs.private;

    logger.info('Listing all accounts...');

    const accounts = accountState.listAccounts();

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
  new AccountListCommand().execute(args);

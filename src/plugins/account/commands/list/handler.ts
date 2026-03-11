import type { Command } from '@/core/commands/command.interface';
import type {
  CommandHandlerArgs,
  CommandResult,
} from '@/core/plugins/plugin.interface';
import type { ListAccountsOutput } from './output';

import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

import { ListAccountsInputSchema } from './input';

export class ListAccountsCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const accountState = new ZustandAccountStateHelper(api.state, logger);

    const validArgs = ListAccountsInputSchema.parse(args.args);

    const showPrivateKeys = validArgs.private;

    logger.info('Listing all accounts...');

    const accounts = accountState.listAccounts();

    const outputData: ListAccountsOutput = {
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

import type {
  CommandHandlerArgs,
  CommandResult,
} from '@/core/plugins/plugin.interface';
import type { ListAccountsOutput } from './output';
import type {
  ListAccountsBuildTransactionResult,
  ListAccountsExecuteTransactionResult,
  ListAccountsNormalisedParams,
  ListAccountsSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

import { ListAccountsInputSchema } from './input';

export class ListAccountsCommand extends BaseTransactionCommand<
  ListAccountsNormalisedParams,
  ListAccountsBuildTransactionResult,
  ListAccountsSignTransactionResult,
  ListAccountsExecuteTransactionResult
> {
  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<ListAccountsNormalisedParams> {
    const validArgs = ListAccountsInputSchema.parse(args.args);
    return { showPrivateKeys: validArgs.private };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    p: ListAccountsNormalisedParams,
  ): Promise<ListAccountsBuildTransactionResult> {
    void args;
    void p;
    return {};
  }

  async signTransaction(
    args: CommandHandlerArgs,
    p: ListAccountsNormalisedParams,
    b: ListAccountsBuildTransactionResult,
  ): Promise<ListAccountsSignTransactionResult> {
    void args;
    void p;
    void b;
    return {};
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    p: ListAccountsNormalisedParams,
    b: ListAccountsBuildTransactionResult,
    s: ListAccountsSignTransactionResult,
  ): Promise<ListAccountsExecuteTransactionResult> {
    void p;
    void b;
    void s;
    const { api, logger } = args;
    const accountState = new ZustandAccountStateHelper(api.state, logger);
    const accounts = accountState.listAccounts();
    return { accounts };
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    p: ListAccountsNormalisedParams,
    b: ListAccountsBuildTransactionResult,
    s: ListAccountsSignTransactionResult,
    e: ListAccountsExecuteTransactionResult,
  ): Promise<CommandResult> {
    void args;
    void b;
    void s;

    const outputData: ListAccountsOutput = {
      accounts: e.accounts.map((account) => ({
        name: account.name,
        accountId: account.accountId,
        type: account.type,
        network: account.network,
        evmAddress: account.evmAddress,
        ...(p.showPrivateKeys && { keyRefId: account.keyRefId }),
      })),
      totalCount: e.accounts.length,
    };

    return { result: outputData };
  }
}

import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ClearAccountsOutput } from './output';
import type {
  ClearAccountsBuildTransactionResult,
  ClearAccountsExecuteTransactionResult,
  ClearAccountsNormalisedParams,
  ClearAccountsSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

export class ClearAccountsCommand extends BaseTransactionCommand<
  ClearAccountsNormalisedParams,
  ClearAccountsBuildTransactionResult,
  ClearAccountsSignTransactionResult,
  ClearAccountsExecuteTransactionResult
> {
  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<ClearAccountsNormalisedParams> {
    void args;
    return {};
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    p: ClearAccountsNormalisedParams,
  ): Promise<ClearAccountsBuildTransactionResult> {
    void args;
    void p;
    return {};
  }

  async signTransaction(
    args: CommandHandlerArgs,
    p: ClearAccountsNormalisedParams,
    b: ClearAccountsBuildTransactionResult,
  ): Promise<ClearAccountsSignTransactionResult> {
    void args;
    void p;
    void b;
    return {};
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    p: ClearAccountsNormalisedParams,
    b: ClearAccountsBuildTransactionResult,
    s: ClearAccountsSignTransactionResult,
  ): Promise<ClearAccountsExecuteTransactionResult> {
    void p;
    void b;
    void s;
    const { api, logger } = args;
    const accountState = new ZustandAccountStateHelper(api.state, logger);

    logger.info('Clearing all accounts...');

    const accounts = accountState.listAccounts();
    const count = accounts.length;

    api.alias.clear(AliasType.Account);
    accountState.clearAccounts();

    return { clearedCount: count };
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    p: ClearAccountsNormalisedParams,
    b: ClearAccountsBuildTransactionResult,
    s: ClearAccountsSignTransactionResult,
    e: ClearAccountsExecuteTransactionResult,
  ): Promise<CommandResult> {
    void args;
    void p;
    void b;
    void s;

    const outputData: ClearAccountsOutput = {
      clearedCount: e.clearedCount,
    };

    return { result: outputData };
  }
}

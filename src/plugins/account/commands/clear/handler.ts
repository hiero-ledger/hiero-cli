/**
 * Account Clear Command Handler
 * Handles clearing all accounts using the Core API
 * Follows ADR-003 contract: returns CommandResult
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { ClearAccountsOutput } from './output';

import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

export async function clearAccounts(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const accountState = new ZustandAccountStateHelper(api.state, logger);

  logger.info('Clearing all accounts...');

  const accounts = accountState.listAccounts();
  const count = accounts.length;

  api.alias.clear(ALIAS_TYPE.Account);

  accountState.clearAccounts();

  const outputData: ClearAccountsOutput = {
    clearedCount: count,
  };

  return { result: outputData };
}

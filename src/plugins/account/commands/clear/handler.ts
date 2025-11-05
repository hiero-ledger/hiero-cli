/**
 * Account Clear Command Handler
 * Handles clearing all accounts using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../utils/errors';
import { ZustandAccountStateHelper } from '../../zustand-state-helper';
import { ClearAccountsOutput } from './output';

export async function clearAccounts(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Initialize Zustand state helper
  const accountState = new ZustandAccountStateHelper(api.state, logger);

  logger.log('Clearing all accounts...');

  try {
    const accounts = accountState.listAccounts();
    const count = accounts.length;

    // Clear all accounts
    accountState.clearAccounts();

    // Prepare output data
    const outputData: ClearAccountsOutput = {
      clearedCount: count,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to clear accounts', error),
    };
  }
}

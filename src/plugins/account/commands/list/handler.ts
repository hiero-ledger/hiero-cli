/**
 * Account List Command Handler
 * Handles listing all accounts using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type {
  CommandHandlerArgs,
  CommandResult,
} from '@/core/plugins/plugin.interface';
import type { ListAccountsOutput } from './output';

import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

import { ListAccountsInputSchema } from './input';

export async function listAccounts(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  // Initialize Zustand state helper
  const accountState = new ZustandAccountStateHelper(api.state, logger);

  // Parse and validate command arguments
  const validArgs = ListAccountsInputSchema.parse(args.args);

  const showPrivateKeys = validArgs.private;

  logger.info('Listing all accounts...');

  const accounts = accountState.listAccounts();

  // Prepare output data
  const outputData: ListAccountsOutput = {
    accounts: accounts.map((account) => ({
      name: account.name,
      accountId: account.accountId,
      type: account.type,
      network: account.network,
      evmAddress: account.evmAddress,
      // Only include keyRefId when --private flag is used
      ...(showPrivateKeys && { keyRefId: account.keyRefId }),
    })),
    totalCount: accounts.length,
  };

  return { result: outputData };
}

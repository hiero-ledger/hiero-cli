/**
 * Account Delete Command Handler
 * Handles deleting accounts using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { Status } from '../../../../core/shared/constants';
import { formatError } from '../../../../core/utils/errors';
import { ZustandAccountStateHelper } from '../../zustand-state-helper';
import { AliasType } from '../../../../core/services/alias/alias-service.interface';
import { DeleteAccountOutput } from './output';

export async function deleteAccount(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Initialize Zustand state helper
  const accountState = new ZustandAccountStateHelper(api.state, logger);

  // Extract command arguments
  const name = args.args.name as string;
  const accountId = args.args.id as string;

  logger.info(`Deleting account...`);

  try {
    let accountToDelete;

    // Find account by name or ID
    if (name) {
      accountToDelete = accountState.loadAccount(name);
      if (!accountToDelete) {
        throw new Error(`Account with name '${name}' not found`);
      }
    } else if (accountId) {
      const accounts = accountState.listAccounts();
      accountToDelete = accounts.find((acc) => acc.accountId === accountId);
      if (!accountToDelete) {
        throw new Error(`Account with ID '${accountId}' not found`);
      }
    } else {
      throw new Error('Either name or id must be provided');
    }

    // Remove any names associated with this account on the current network
    const currentNetwork = api.network.getCurrentNetwork();
    const aliasesForAccount = api.alias
      .list({ network: currentNetwork, type: AliasType.Account })
      .filter((rec) => rec.entityId === accountToDelete.accountId);

    const removedAliases: string[] = [];
    for (const rec of aliasesForAccount) {
      api.alias.remove(rec.alias, currentNetwork);
      removedAliases.push(`${rec.alias} (${currentNetwork})`);
      logger.info(`🧹 Removed alias '${rec.alias}' on ${currentNetwork}`);
    }

    // Delete account from state
    accountState.deleteAccount(accountToDelete.name);

    // Prepare output data
    const outputData: DeleteAccountOutput = {
      deletedAccount: {
        name: accountToDelete.name,
        accountId: accountToDelete.accountId,
      },
      ...(removedAliases.length > 0 && { removedAliases }),
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to delete account', error),
    };
  }
}

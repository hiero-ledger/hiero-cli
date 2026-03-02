/**
 * Account Delete Command Handler
 * Handles deleting accounts using the Core API
 * Follows ADR-003 contract: returns CommandResult
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { DeleteAccountOutput } from './output';

import { NotFoundError } from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

import { DeleteAccountInputSchema } from './input';

export async function deleteAccount(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const accountState = new ZustandAccountStateHelper(api.state, logger);

  const validArgs = DeleteAccountInputSchema.parse(args.args);
  const accountRef = validArgs.account;
  const isEntityId = EntityIdSchema.safeParse(accountRef).success;
  let accountToDelete;

  if (isEntityId) {
    const accounts = accountState.listAccounts();
    accountToDelete = accounts.find((acc) => acc.accountId === accountRef);
    if (!accountToDelete) {
      throw new NotFoundError(`Account with ID '${accountRef}' not found`);
    }
  } else {
    accountToDelete = accountState.loadAccount(accountRef);
    if (!accountToDelete) {
      throw new NotFoundError(`Account with name '${accountRef}' not found`);
    }
  }

  const currentNetwork = api.network.getCurrentNetwork();
  const aliasesForAccount = api.alias
    .list({ network: currentNetwork, type: ALIAS_TYPE.Account })
    .filter((rec) => rec.entityId === accountToDelete.accountId);

  const removedAliases: string[] = [];
  for (const rec of aliasesForAccount) {
    api.alias.remove(rec.alias, currentNetwork);
    removedAliases.push(`${rec.alias} (${currentNetwork})`);
    logger.info(`🧹 Removed alias '${rec.alias}' on ${currentNetwork}`);
  }

  accountState.deleteAccount(accountToDelete.name);

  const accountsWithSameKeyRef = accountState
    .listAccounts()
    .filter((acc) => acc.keyRefId === accountToDelete.keyRefId);
  const isOtherAccountUseSameKey = accountsWithSameKeyRef.length > 1;

  const operator = api.network.getCurrentOperatorOrThrow();
  const isOperatorHaveSameKeyRef =
    operator.keyRefId === accountToDelete.keyRefId;

  if (!isOtherAccountUseSameKey && !isOperatorHaveSameKeyRef) {
    api.kms.remove(accountToDelete.keyRefId);
  }

  const outputData: DeleteAccountOutput = {
    deletedAccount: {
      name: accountToDelete.name,
      accountId: accountToDelete.accountId,
    },
    removedAliases,
    network: currentNetwork,
  };

  return { result: outputData };
}

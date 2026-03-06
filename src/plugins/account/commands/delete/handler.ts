/**
 * Account Delete Command Handler
 * Handles deleting accounts using the Core API
 * Follows ADR-003 contract: returns CommandResult
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { DeleteAccountOutput } from './output';

import { NotFoundError } from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
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
  const network = api.network.getCurrentNetwork();
  let accountToDelete;
  let key;

  if (isEntityId) {
    key = composeKey(network, accountRef);
  } else {
    const alias = api.alias.resolveOrThrow(
      accountRef,
      AliasType.Account,
      network,
    );
    if (!alias.entityId) {
      throw new NotFoundError(
        `Alias for account ${accountRef} is missing account ID in its record`,
      );
    }
    key = composeKey(network, alias.entityId);
  }
  accountToDelete = accountState.getAccount(key);
  if (!accountToDelete) {
    throw new NotFoundError(`Account with ID '${accountRef}' not found`);
  }

  const aliasesForAccount = api.alias
    .list({ network, type: AliasType.Account })
    .filter((rec) => rec.entityId === accountToDelete.accountId);

  const removedAliases: string[] = [];
  for (const rec of aliasesForAccount) {
    api.alias.remove(rec.alias, network);
    removedAliases.push(`${rec.alias} (${network})`);
    logger.info(`🧹 Removed alias '${rec.alias}' on ${network}`);
  }

  accountState.deleteAccount(key);

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
    network,
  };

  return { result: outputData };
}

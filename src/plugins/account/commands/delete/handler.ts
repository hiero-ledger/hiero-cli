/**
 * Account Delete Command Handler
 * Handles deleting accounts using the Core API
 * Follows ADR-003 contract: returns CommandResult
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { AccountData } from '@/plugins/account/schema';
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
  const currentNetwork = api.network.getCurrentNetwork();
  const accounts = accountState.listAccounts();
  let accountToDelete: AccountData | undefined;

  const entityIdResult = EntityIdSchema.safeParse(accountRef);
  if (entityIdResult.success) {
    accountToDelete = accounts.find((acc) => acc.accountId === accountRef);
    if (!accountToDelete) {
      throw new NotFoundError(`Account with ID '${accountRef}' not found`);
    }
  } else {
    const aliasRecord = api.alias.resolve(
      accountRef,
      ALIAS_TYPE.Account,
      currentNetwork,
    );
    if (aliasRecord?.entityId) {
      accountToDelete = accounts.find(
        (acc) => acc.accountId === aliasRecord.entityId,
      );
      if (accountToDelete) {
        logger.info(
          `Found account via alias: ${aliasRecord.alias} -> ${accountToDelete.accountId}`,
        );
      }
    }
    if (!accountToDelete) {
      accountToDelete = accountState.loadAccount(accountRef) ?? undefined;
    }
    if (!accountToDelete) {
      throw new NotFoundError(
        `Account not found with ID or alias: ${accountRef}`,
      );
    }
  }

  const account = accountToDelete;

  const aliasesForAccount = api.alias
    .list({ network: currentNetwork, type: ALIAS_TYPE.Account })
    .filter((rec) => rec.entityId === account.accountId);

  const removedAliases: string[] = [];
  for (const rec of aliasesForAccount) {
    api.alias.remove(rec.alias, currentNetwork);
    removedAliases.push(`${rec.alias} (${currentNetwork})`);
    logger.info(`🧹 Removed alias '${rec.alias}' on ${currentNetwork}`);
  }

  accountState.deleteAccount(account.name);

  const accountsWithSameKeyRef = accountState
    .listAccounts()
    .filter((acc) => acc.keyRefId === account.keyRefId);
  const isOtherAccountUseSameKey = accountsWithSameKeyRef.length > 1;

  const operator = api.network.getCurrentOperatorOrThrow();
  const isOperatorHaveSameKeyRef = operator.keyRefId === account.keyRefId;

  if (!isOtherAccountUseSameKey && !isOperatorHaveSameKeyRef) {
    api.kms.remove(account.keyRefId);
  }

  const outputData: DeleteAccountOutput = {
    deletedAccount: {
      name: account.name,
      accountId: account.accountId,
    },
    removedAliases,
    network: currentNetwork,
  };

  return { result: outputData };
}

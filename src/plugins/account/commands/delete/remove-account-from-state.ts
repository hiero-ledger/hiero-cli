import type { CoreApi, Logger } from '@/core';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { AccountData } from '@/plugins/account/schema';

import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

export function removeAccountFromLocalState(
  api: CoreApi,
  logger: Logger,
  accountToDelete: AccountData,
  network: SupportedNetwork,
): string[] {
  const accountState = new ZustandAccountStateHelper(api.state, logger);
  const key = composeKey(network, accountToDelete.accountId);

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

  return removedAliases;
}

import type {
  AliasService,
  KmsService,
  Logger,
  NetworkService,
  StateService,
} from '@/core';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { AccountData } from '@/plugins/account/schema';

import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

export class AccountHelper {
  private readonly accountState: ZustandAccountStateHelper;
  private readonly logger: Logger;

  constructor(
    state: StateService,
    logger: Logger,
    private readonly alias: AliasService,
    private readonly kms: KmsService,
    private readonly network: NetworkService,
  ) {
    this.logger = logger;
    this.accountState = new ZustandAccountStateHelper(state, logger);
  }

  removeAccountFromLocalState(
    accountToDelete: AccountData,
    network: SupportedNetwork,
  ): string[] {
    const key = composeKey(network, accountToDelete.accountId);

    const aliasesForAccount = this.alias
      .list({ network, type: AliasType.Account })
      .filter((rec) => rec.entityId === accountToDelete.accountId);

    const removedAliases: string[] = [];
    for (const rec of aliasesForAccount) {
      this.alias.remove(rec.alias, network);
      removedAliases.push(`${rec.alias} (${network})`);
      this.logger.info(`🧹 Removed alias '${rec.alias}' on ${network}`);
    }

    this.accountState.deleteAccount(key);

    const accountsWithSameKeyRef = this.accountState
      .listAccounts()
      .filter((acc) => acc.keyRefId === accountToDelete.keyRefId);
    const isOtherAccountUseSameKey = accountsWithSameKeyRef.length > 1;

    const operator = this.network.getCurrentOperatorOrThrow();
    const isOperatorHaveSameKeyRef =
      operator.keyRefId === accountToDelete.keyRefId;

    if (!isOtherAccountUseSameKey && !isOperatorHaveSameKeyRef) {
      this.kms.remove(accountToDelete.keyRefId);
    }

    return removedAliases;
  }
}

import type { AliasService, KmsService, Logger, NetworkService } from '@/core';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { AccountCleanupService } from '@/plugins/account/services/account-cleanup.service.interface';
import type {
  AccountDeleteKmsCleanupInput,
  AccountDeleteLocalStateInput,
} from '@/plugins/account/services/account-cleanup.types';
import type { AccountStateService } from '@/plugins/account/services/account-state.service.interface';

import { AliasType } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';

export class AccountCleanupServiceImpl implements AccountCleanupService {
  constructor(
    private readonly accountState: AccountStateService,
    private readonly alias: AliasService,
    private readonly kms: KmsService,
    private readonly network: NetworkService,
    private readonly logger: Logger,
  ) {}

  removeAccountFromLocalState(
    accountToDelete: AccountDeleteLocalStateInput,
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
      this.logger.info(`Removed alias '${rec.alias}' on ${network}`);
    }

    this.accountState.deleteAccount(key);

    return removedAliases;
  }

  removeKeyAliasesForCredential(
    accountToDelete: AccountDeleteKmsCleanupInput,
  ): string[] {
    const keyAliases = this.alias
      .list({ type: AliasType.Key })
      .filter((rec) => rec.keyRefId === accountToDelete.keyRefId);

    const removedAliases: string[] = [];
    for (const rec of keyAliases) {
      this.alias.remove(rec.alias, rec.network);
      removedAliases.push(`${rec.alias} (${rec.network})`);
      this.logger.info(`Removed key alias '${rec.alias}' on ${rec.network}`);
    }

    return removedAliases;
  }

  removeKmsCredentialIfUnusedAfterAccountRemoved(
    accountToDelete: AccountDeleteKmsCleanupInput,
  ): void {
    const otherAccountsWithSameKey = this.accountState
      .listAccounts()
      .filter((acc) => acc.keyRefId === accountToDelete.keyRefId);
    if (otherAccountsWithSameKey.length > 0) {
      return;
    }

    const operator = this.network.getCurrentOperatorOrThrow();
    if (operator.keyRefId === accountToDelete.keyRefId) {
      return;
    }

    this.kms.remove(accountToDelete.keyRefId);
  }
}

import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { DeleteAccountOutput } from './output';
import type {
  DeleteAccountBuildTransactionResult,
  DeleteAccountExecuteTransactionResult,
  DeleteAccountNormalisedParams,
  DeleteAccountSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { NotFoundError } from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

import { DeleteAccountInputSchema } from './input';

export class DeleteAccountCommand extends BaseTransactionCommand<
  DeleteAccountNormalisedParams,
  DeleteAccountBuildTransactionResult,
  DeleteAccountSignTransactionResult,
  DeleteAccountExecuteTransactionResult
> {
  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<DeleteAccountNormalisedParams> {
    const { api, logger } = args;
    const accountState = new ZustandAccountStateHelper(api.state, logger);

    const validArgs = DeleteAccountInputSchema.parse(args.args);
    const accountRef = validArgs.account;
    const isEntityId = EntityIdSchema.safeParse(accountRef).success;
    const network = api.network.getCurrentNetwork();

    let key: string;

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

    const accountToDelete = accountState.getAccount(key);
    if (!accountToDelete) {
      throw new NotFoundError(`Account with ID '${accountRef}' not found`);
    }

    return { accountRef, key, network, accountToDelete };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    p: DeleteAccountNormalisedParams,
  ): Promise<DeleteAccountBuildTransactionResult> {
    void args;
    void p;
    return {};
  }

  async signTransaction(
    args: CommandHandlerArgs,
    p: DeleteAccountNormalisedParams,
    b: DeleteAccountBuildTransactionResult,
  ): Promise<DeleteAccountSignTransactionResult> {
    void args;
    void p;
    void b;
    return {};
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    p: DeleteAccountNormalisedParams,
    b: DeleteAccountBuildTransactionResult,
    s: DeleteAccountSignTransactionResult,
  ): Promise<DeleteAccountExecuteTransactionResult> {
    void b;
    void s;
    const { api, logger } = args;
    const accountState = new ZustandAccountStateHelper(api.state, logger);

    const aliasesForAccount = api.alias
      .list({ network: p.network, type: AliasType.Account })
      .filter((rec) => rec.entityId === p.accountToDelete.accountId);

    const removedAliases: string[] = [];
    for (const rec of aliasesForAccount) {
      api.alias.remove(rec.alias, p.network);
      removedAliases.push(`${rec.alias} (${p.network})`);
      logger.info(`🧹 Removed alias '${rec.alias}' on ${p.network}`);
    }

    accountState.deleteAccount(p.key);

    const accountsWithSameKeyRef = accountState
      .listAccounts()
      .filter((acc) => acc.keyRefId === p.accountToDelete.keyRefId);
    const isOtherAccountUseSameKey = accountsWithSameKeyRef.length > 1;

    const operator = api.network.getCurrentOperatorOrThrow();
    const isOperatorHaveSameKeyRef =
      operator.keyRefId === p.accountToDelete.keyRefId;

    if (!isOtherAccountUseSameKey && !isOperatorHaveSameKeyRef) {
      api.kms.remove(p.accountToDelete.keyRefId);
    }

    return { removedAliases };
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    p: DeleteAccountNormalisedParams,
    b: DeleteAccountBuildTransactionResult,
    s: DeleteAccountSignTransactionResult,
    e: DeleteAccountExecuteTransactionResult,
  ): Promise<CommandResult> {
    void args;
    void b;
    void s;

    const outputData: DeleteAccountOutput = {
      deletedAccount: {
        name: p.accountToDelete.name,
        accountId: p.accountToDelete.accountId,
      },
      removedAliases: e.removedAliases,
      network: p.network,
    };

    return { result: outputData };
  }
}

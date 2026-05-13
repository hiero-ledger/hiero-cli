import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { AliasService } from '@/core/services/alias/alias-service.interface';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { AccountData } from '@/plugins/account/schema';
import type { AccountCleanupService } from '@/plugins/account/services/account-cleanup.service.interface';
import type { AccountStateService } from '@/plugins/account/services/account-state.service.interface';
import type { AccountDeleteOutput } from './output';
import type {
  DeleteBuildTransactionResult,
  DeleteExecuteTransactionResult,
  DeleteNormalisedParams,
  DeleteSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import {
  AccountReferenceObjectSchema,
  EntityIdSchema,
  KeySchema,
} from '@/core/schemas';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { AliasType } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { AccountCleanupServiceImpl } from '@/plugins/account/services/account-cleanup.service';
import { AccountStateServiceImpl } from '@/plugins/account/services/account-state.service';

import { AccountDeleteInputSchema } from './input';

export const ACCOUNT_DELETE_COMMAND_NAME = 'account_delete';

export class AccountDeleteCommand extends BaseTransactionCommand<
  DeleteNormalisedParams,
  DeleteBuildTransactionResult,
  DeleteSignTransactionResult,
  DeleteExecuteTransactionResult
> {
  constructor(
    private readonly accountState: AccountStateService,
    private readonly accountCleanup: AccountCleanupService,
  ) {
    super(ACCOUNT_DELETE_COMMAND_NAME);
  }

  override async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const validArgs = AccountDeleteInputSchema.parse(args.args);
    if (validArgs.stateOnly) {
      return this.executeStateOnlyDelete(args);
    }
    return super.execute(args);
  }

  private async executeStateOnlyDelete(
    args: CommandHandlerArgs,
  ): Promise<CommandResult> {
    const resolved = await this.resolveAccountFromState(args);

    const removedAliases = this.accountCleanup.removeAccountFromLocalState(
      resolved.accountToDelete,
      resolved.network,
    );

    const outputData: AccountDeleteOutput = {
      deletedAccount: {
        name: resolved.accountToDelete.name,
        accountId: resolved.accountToDelete.accountId,
      },
      removedAliases,
      network: resolved.network,
      stateOnly: true,
    };

    return { result: outputData };
  }

  private async resolveEntityIdFromAccountRef(
    args: CommandHandlerArgs,
  ): Promise<{
    stateKey: string;
    accountRef: string;
    network: SupportedNetwork;
  }> {
    const { api } = args;
    const validArgs = AccountDeleteInputSchema.parse(args.args);
    const accountRef = validArgs.account;
    const network = api.network.getCurrentNetwork();
    const parsed = AccountReferenceObjectSchema.parse(accountRef);
    const { accountId } = await api.identityResolution.resolveAccount({
      accountReference: parsed.value,
      type: parsed.type,
      network,
    });
    const stateKey = composeKey(network, accountId);
    return { stateKey, accountRef, network };
  }

  private async resolveAccountFromState(args: CommandHandlerArgs): Promise<{
    accountToDelete: AccountData;
    network: SupportedNetwork;
    stateKey: string;
    accountRef: string;
  }> {
    const { stateKey, accountRef, network } =
      await this.resolveEntityIdFromAccountRef(args);

    const accountToDelete = this.accountState.getAccount(stateKey);
    if (!accountToDelete) {
      throw new NotFoundError(`Account with ID '${accountRef}' not found`);
    }

    return { accountToDelete, network, stateKey, accountRef };
  }

  private resolveTransferAccountId(
    transferRef: string,
    network: SupportedNetwork,
    aliasService: AliasService,
  ): string {
    if (EntityIdSchema.safeParse(transferRef).success) {
      return transferRef;
    }
    const alias = aliasService.resolveOrThrow(
      transferRef,
      AliasType.Account,
      network,
    );
    if (!alias.entityId) {
      throw new NotFoundError(
        `Alias for transfer account '${transferRef}' is missing account ID in its record`,
      );
    }
    return alias.entityId;
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<DeleteNormalisedParams> {
    const { api } = args;
    const validArgs = AccountDeleteInputSchema.parse(args.args);
    const credential = KeySchema.parse(validArgs.account);
    const keyManager = api.config.getOption<KeyManager>(
      ConfigOptionKey.default_key_manager,
    );
    const resolvedCredential = await api.keyResolver.resolveAccountCredentials(
      credential,
      keyManager,
      false,
      ['account:delete'],
    );
    const transferId = validArgs.transferId;
    if (!transferId) {
      throw new ValidationError(
        'transfer-id is required when deleting on Hedera (use --state-only to remove only from local state)',
      );
    }
    const network = api.network.getCurrentNetwork();
    const stateKey = composeKey(network, resolvedCredential.accountId);
    const localAccount = this.accountState.getAccount(stateKey);

    const transferAccountId = this.resolveTransferAccountId(
      transferId,
      network,
      api.alias,
    );

    if (transferAccountId === resolvedCredential.accountId) {
      throw new ValidationError(
        'Transfer account must be different from the account being deleted',
        {
          context: {
            accountId: resolvedCredential.accountId,
            transferAccountId,
          },
        },
      );
    }

    return {
      network,
      stateKey,
      accountToDelete: {
        accountId: resolvedCredential.accountId,
        keyRefId: resolvedCredential.keyRefId,
        name: localAccount?.name,
      },
      transferAccountId,
      accountRef: validArgs.account,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: DeleteNormalisedParams,
  ): Promise<DeleteBuildTransactionResult> {
    const { api } = args;
    return api.account.deleteAccount({
      accountId: normalisedParams.accountToDelete.accountId,
      transferAccountId: normalisedParams.transferAccountId,
    });
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: DeleteNormalisedParams,
    buildTransactionResult: DeleteBuildTransactionResult,
  ): Promise<DeleteSignTransactionResult> {
    const { api } = args;
    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [normalisedParams.accountToDelete.keyRefId],
    );
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _normalisedParams: DeleteNormalisedParams,
    _buildTransactionResult: DeleteBuildTransactionResult,
    signTransactionResult: DeleteSignTransactionResult,
  ): Promise<DeleteExecuteTransactionResult> {
    const { api } = args;
    return {
      transactionResult: await api.txExecute.execute(
        signTransactionResult.signedTransaction,
      ),
    };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: DeleteNormalisedParams,
    _buildTransactionResult: DeleteBuildTransactionResult,
    _signTransactionResult: DeleteSignTransactionResult,
    executeTransactionResult: DeleteExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { transactionResult } = executeTransactionResult;

    if (!transactionResult.success) {
      throw new TransactionError(
        `Failed to delete account (txId: ${transactionResult.transactionId})`,
        false,
        {
          context: {
            transactionId: transactionResult.transactionId,
            network: normalisedParams.network,
          },
        },
      );
    }

    const removedAliases = this.accountCleanup.removeAccountFromLocalState(
      normalisedParams.accountToDelete,
      normalisedParams.network,
    );
    this.accountCleanup.removeKmsCredentialIfUnusedAfterAccountRemoved(
      normalisedParams.accountToDelete,
    );

    const outputData: AccountDeleteOutput = {
      deletedAccount: {
        name: normalisedParams.accountToDelete.name,
        accountId: normalisedParams.accountToDelete.accountId,
      },
      removedAliases,
      network: normalisedParams.network,
      transactionId: transactionResult.transactionId,
      stateOnly: false,
    };

    return { result: outputData };
  }
}

export async function accountDelete(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const accountState = new AccountStateServiceImpl(
    args.api.state,
    args.api.logger,
  );
  const accountCleanup = new AccountCleanupServiceImpl(
    accountState,
    args.api.alias,
    args.api.kms,
    args.api.network,
    args.api.logger,
  );

  return new AccountDeleteCommand(accountState, accountCleanup).execute(args);
}

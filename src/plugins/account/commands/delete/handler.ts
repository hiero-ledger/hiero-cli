import type { CommandHandlerArgs, CommandResult, CoreApi } from '@/core';
import type { ResolvedAccountCredential } from '@/core/services/key-resolver/types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { AccountData } from '@/plugins/account/schema';
import type { AccountDeleteOutput } from './output';
import type {
  DeleteBuildTransactionResult,
  DeleteExecuteTransactionResult,
  DeleteNormalisedParams,
  DeleteSignTransactionResult,
} from './types';

import { AccountId } from '@hashgraph/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  StateError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { EntityIdSchema, KeySchema } from '@/core/schemas';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { EntityReferenceType } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { AccountHelper } from '@/plugins/account/account-helper';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

import { AccountDeleteInputSchema } from './input';

export const ACCOUNT_DELETE_COMMAND_NAME = 'account_delete';

export class AccountDeleteCommand extends BaseTransactionCommand<
  DeleteNormalisedParams,
  DeleteBuildTransactionResult,
  DeleteSignTransactionResult,
  DeleteExecuteTransactionResult
> {
  constructor() {
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
    const { api } = args;
    const resolved = await this.resolveAccountFromState(args);
    const accountHelper = new AccountHelper(
      api.state,
      api.logger,
      api.alias,
      api.kms,
      api.network,
    );

    const removedAliases = accountHelper.removeAccountFromLocalState(
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

  private resolveEntityIdFromAccountRef(args: CommandHandlerArgs): {
    entityId: string;
    stateKey: string;
    accountRef: string;
    network: SupportedNetwork;
  } {
    const { api } = args;
    const validArgs = AccountDeleteInputSchema.parse(args.args);
    const accountRef = validArgs.account;
    const network = api.network.getCurrentNetwork();
    const referenceType: EntityReferenceType = EntityIdSchema.safeParse(
      accountRef,
    ).success
      ? EntityReferenceType.ENTITY_ID
      : EntityReferenceType.ALIAS;

    const { entityIdOrEvmAddress } =
      api.identityResolution.resolveReferenceToEntityOrEvmAddress({
        entityReference: accountRef,
        referenceType,
        network,
        aliasType: AliasType.Account,
      });

    const entityId = AccountId.fromString(entityIdOrEvmAddress).toString();
    const stateKey = composeKey(network, entityId);
    return { entityId, stateKey, accountRef, network };
  }

  private async resolveAccountFromState(args: CommandHandlerArgs): Promise<{
    accountToDelete: AccountData;
    network: SupportedNetwork;
    stateKey: string;
    accountRef: string;
  }> {
    const { api, logger } = args;
    const accountState = new ZustandAccountStateHelper(api.state, logger);
    const { stateKey, accountRef, network } =
      this.resolveEntityIdFromAccountRef(args);

    const accountToDelete = accountState.getAccount(stateKey);
    if (!accountToDelete) {
      throw new NotFoundError(`Account with ID '${accountRef}' not found`);
    }

    return { accountToDelete, network, stateKey, accountRef };
  }

  private resolveTransferAccountId(
    transferRef: string,
    network: SupportedNetwork,
    api: CoreApi,
  ): string {
    if (EntityIdSchema.safeParse(transferRef).success) {
      return transferRef;
    }
    const alias = api.alias.resolveOrThrow(
      transferRef,
      AliasType.Account,
      network,
    );
    return alias.entityId!;
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<DeleteNormalisedParams> {
    const { api, logger } = args;
    const validArgs = AccountDeleteInputSchema.parse(args.args);
    const credential = KeySchema.parse(validArgs.account);
    const keyManager = api.config.getOption<KeyManager>('default_key_manager');
    let resolvedCredential: ResolvedAccountCredential;
    try {
      resolvedCredential = await api.keyResolver.resolveAccountCredentials(
        credential,
        keyManager,
        false,
        ['account:delete'],
      );
    } catch (error) {
      if (error instanceof StateError) {
        throw new ValidationError(
          'Cannot delete this account on Hedera without a private key to sign the transaction. Pass the account ID and private key together (for example 0.0.x:your-private-key), or run `account import` with that key first so this CLI can store it; then run delete again using the account ID or alias.',
          { cause: error, context: { account: validArgs.account } },
        );
      }
      throw error;
    }
    const transferId = validArgs.transferId;
    if (!transferId) {
      throw new ValidationError(
        'transfer-id is required when deleting on Hedera (use --state-only to remove only from local state)',
      );
    }
    const network = api.network.getCurrentNetwork();
    const stateKey = composeKey(network, resolvedCredential.accountId);
    const accountState = new ZustandAccountStateHelper(api.state, logger);
    const localAccount = accountState.getAccount(stateKey);

    const transferAccountId = this.resolveTransferAccountId(
      transferId,
      network,
      args.api,
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
    return api.txExecute.execute(signTransactionResult.signedTransaction);
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: DeleteNormalisedParams,
    _buildTransactionResult: DeleteBuildTransactionResult,
    _signTransactionResult: DeleteSignTransactionResult,
    executeTransactionResult: DeleteExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { api } = args;

    if (!executeTransactionResult.success) {
      throw new TransactionError(
        `Failed to delete account (txId: ${executeTransactionResult.transactionId})`,
        false,
        {
          context: {
            transactionId: executeTransactionResult.transactionId,
            network: normalisedParams.network,
          },
        },
      );
    }

    const accountHelper = new AccountHelper(
      api.state,
      api.logger,
      api.alias,
      api.kms,
      api.network,
    );

    const removedAliases = accountHelper.removeAccountFromLocalState(
      normalisedParams.accountToDelete,
      normalisedParams.network,
    );
    accountHelper.removeKmsCredentialIfUnusedAfterAccountRemoved(
      normalisedParams.accountToDelete,
    );

    const outputData: AccountDeleteOutput = {
      deletedAccount: {
        name: normalisedParams.accountToDelete.name,
        accountId: normalisedParams.accountToDelete.accountId,
      },
      removedAliases,
      network: normalisedParams.network,
      transactionId: executeTransactionResult.transactionId,
      stateOnly: false,
    };

    return { result: outputData };
  }
}

export async function accountDelete(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new AccountDeleteCommand().execute(args);
}

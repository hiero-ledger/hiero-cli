import type { CommandHandlerArgs, CommandResult, CoreApi } from '@/core';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { AccountData } from '@/plugins/account/schema';
import type { AccountDeleteOutput } from './output';
import type {
  AccountDeleteContext,
  DeleteBuildTransactionResult,
  DeleteExecuteTransactionResult,
  DeleteNormalisedParams,
  DeleteSignTransactionResult,
} from './types';

import { AccountId, PublicKey } from '@hashgraph/sdk';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas';
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

  private async resolveAccountForNetworkDelete(
    args: CommandHandlerArgs,
  ): Promise<{
    accountToDelete: AccountDeleteContext;
    network: SupportedNetwork;
    stateKey: string;
    accountRef: string;
  }> {
    const { api, logger } = args;
    const accountState = new ZustandAccountStateHelper(api.state, logger);
    const { entityId, stateKey, accountRef, network } =
      this.resolveEntityIdFromAccountRef(args);

    const localAccount = accountState.getAccount(stateKey);
    if (localAccount) {
      return {
        accountToDelete: {
          accountId: localAccount.accountId,
          keyRefId: localAccount.keyRefId,
          name: localAccount.name,
        },
        network,
        stateKey,
        accountRef,
      };
    }

    const accountInfo = await api.mirror.getAccountOrThrow(entityId);
    const publicKeyRaw = PublicKey.fromString(
      accountInfo.accountPublicKey,
    ).toStringRaw();
    const kmsRecord = api.kms.findByPublicKey(publicKeyRaw);
    if (!kmsRecord) {
      throw new ValidationError(
        'Account key not found in key manager. Import the account or add the private key before deleting on the network.',
        { context: { accountId: entityId } },
      );
    }

    return {
      accountToDelete: {
        accountId: AccountId.fromString(accountInfo.accountId).toString(),
        keyRefId: kmsRecord.keyRefId,
      },
      network,
      stateKey,
      accountRef,
    };
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
    const resolved = await this.resolveAccountForNetworkDelete(args);
    const validArgs = AccountDeleteInputSchema.parse(args.args);
    const transferId = validArgs.transferId;
    if (!transferId) {
      throw new ValidationError(
        'transfer-id is required when deleting on Hedera (use --state-only to remove only from local state)',
      );
    }
    const transferAccountId = this.resolveTransferAccountId(
      transferId,
      resolved.network,
      args.api,
    );

    if (transferAccountId === resolved.accountToDelete.accountId) {
      throw new ValidationError(
        'Transfer account must be different from the account being deleted',
        {
          context: {
            accountId: resolved.accountToDelete.accountId,
            transferAccountId,
          },
        },
      );
    }

    return {
      network: resolved.network,
      stateKey: resolved.stateKey,
      accountToDelete: resolved.accountToDelete,
      transferAccountId,
      accountRef: resolved.accountRef,
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

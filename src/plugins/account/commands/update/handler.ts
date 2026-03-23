import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { AccountData } from '@/plugins/account/schema';
import type { AccountUpdateOutput } from './output';
import type {
  UpdateBuildTransactionResult,
  UpdateExecuteTransactionResult,
  UpdateNormalisedParams,
  UpdateSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import {
  NotFoundError,
  StateError,
  TransactionError,
  ValidationError,
} from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

import { AccountUpdateInputSchema } from './input';

export const ACCOUNT_UPDATE_COMMAND_NAME = 'account_update';

function parseExpirationTime(value: string): Date {
  const isUnixTimestamp = /^\d+$/.test(value);
  return isUnixTimestamp ? new Date(Number(value) * 1000) : new Date(value);
}

export class AccountUpdateCommand extends BaseTransactionCommand<
  UpdateNormalisedParams,
  UpdateBuildTransactionResult,
  UpdateSignTransactionResult,
  UpdateExecuteTransactionResult
> {
  constructor() {
    super(ACCOUNT_UPDATE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<UpdateNormalisedParams> {
    const { api, logger } = args;

    const validArgs = AccountUpdateInputSchema.parse(args.args);
    const network = api.network.getCurrentNetwork();
    const accountRef = validArgs.account;
    const accountState = new ZustandAccountStateHelper(api.state, logger);

    const isEntityId = EntityIdSchema.safeParse(accountRef).success;
    let accountStateKey: string;

    if (isEntityId) {
      accountStateKey = composeKey(network, accountRef);
    } else {
      const alias = api.alias.resolveOrThrow(
        accountRef,
        AliasType.Account,
        network,
      );
      if (!alias.entityId) {
        throw new NotFoundError(
          `Alias for account '${accountRef}' is missing account ID in its record`,
        );
      }
      accountStateKey = composeKey(network, alias.entityId);
    }

    const existingAccount = accountState.getAccount(accountStateKey);
    if (!existingAccount) {
      throw new NotFoundError(`Account '${accountRef}' not found in state`);
    }

    const keyManagerArg = validArgs.keyManager;
    const keyManager =
      keyManagerArg ?? api.config.getOption<KeyManager>('default_key_manager');

    let newPublicKey: string | undefined;
    let newKeyRefId: string | undefined;
    let newKeyType = existingAccount.type;

    if (validArgs.key !== undefined) {
      const resolved = await api.keyResolver.getPublicKey(
        validArgs.key,
        keyManager,
        false,
        ['account:update'],
      );
      if (!api.kms.hasPrivateKey(resolved.keyRefId)) {
        throw new ValidationError(
          `New key '${validArgs.key.rawValue}' has no private key in KMS. Key rotation requires the new key's private key to sign the transaction.`,
        );
      }
      newPublicKey = resolved.publicKey;
      newKeyRefId = resolved.keyRefId;
      const kmsRecord = api.kms.get(resolved.keyRefId);
      if (kmsRecord) {
        newKeyType = kmsRecord.keyAlgorithm;
      }
    }

    const expirationTime =
      validArgs.expirationTime !== undefined
        ? parseExpirationTime(validArgs.expirationTime)
        : undefined;

    const updatedFields: string[] = [];
    if (validArgs.key !== undefined) updatedFields.push('key');
    if (validArgs.memo !== undefined) updatedFields.push('memo');
    if (validArgs.maxAutoAssociations !== undefined)
      updatedFields.push('maxAutoAssociations');
    if (validArgs.stakedAccountId !== undefined)
      updatedFields.push('stakedAccountId');
    if (validArgs.stakedNodeId !== undefined)
      updatedFields.push('stakedNodeId');
    if (validArgs.declineStakingReward !== undefined)
      updatedFields.push('declineStakingReward');
    if (validArgs.autoRenewPeriod !== undefined)
      updatedFields.push('autoRenewPeriod');
    if (validArgs.receiverSignatureRequired !== undefined)
      updatedFields.push('receiverSignatureRequired');
    if (expirationTime !== undefined) updatedFields.push('expirationTime');

    return {
      accountId: existingAccount.accountId,
      network,
      accountStateKey,
      currentKeyRefId: existingAccount.keyRefId,
      newPublicKey,
      newKeyRefId,
      newKeyType,
      memo: validArgs.memo,
      maxAutoAssociations: validArgs.maxAutoAssociations,
      stakedAccountId: validArgs.stakedAccountId,
      stakedNodeId: validArgs.stakedNodeId,
      declineStakingReward: validArgs.declineStakingReward,
      autoRenewPeriod: validArgs.autoRenewPeriod,
      receiverSignatureRequired: validArgs.receiverSignatureRequired,
      expirationTime,
      updatedFields,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: UpdateNormalisedParams,
  ): Promise<UpdateBuildTransactionResult> {
    const { api } = args;
    return api.account.updateAccount({
      accountId: normalisedParams.accountId,
      key: normalisedParams.newPublicKey,
      memo: normalisedParams.memo,
      maxAutoAssociations: normalisedParams.maxAutoAssociations,
      stakedAccountId: normalisedParams.stakedAccountId,
      stakedNodeId: normalisedParams.stakedNodeId,
      declineStakingReward: normalisedParams.declineStakingReward,
      autoRenewPeriod: normalisedParams.autoRenewPeriod,
      receiverSignatureRequired: normalisedParams.receiverSignatureRequired,
      expirationTime: normalisedParams.expirationTime,
    });
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: UpdateNormalisedParams,
    buildTransactionResult: UpdateBuildTransactionResult,
  ): Promise<UpdateSignTransactionResult> {
    const { api } = args;
    const signers = [normalisedParams.currentKeyRefId];

    if (
      normalisedParams.newKeyRefId !== undefined &&
      normalisedParams.newKeyRefId !== normalisedParams.currentKeyRefId
    ) {
      signers.push(normalisedParams.newKeyRefId);
    }

    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      signers,
    );
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _normalisedParams: UpdateNormalisedParams,
    _buildTransactionResult: UpdateBuildTransactionResult,
    signTransactionResult: UpdateSignTransactionResult,
  ): Promise<UpdateExecuteTransactionResult> {
    const { api } = args;
    return api.txExecute.execute(signTransactionResult.signedTransaction);
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: UpdateNormalisedParams,
    _buildTransactionResult: UpdateBuildTransactionResult,
    _signTransactionResult: UpdateSignTransactionResult,
    executeTransactionResult: UpdateExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { api, logger } = args;

    if (!executeTransactionResult.success) {
      throw new TransactionError(
        `Failed to update account (txId: ${executeTransactionResult.transactionId})`,
        false,
      );
    }

    const accountState = new ZustandAccountStateHelper(api.state, logger);
    const existingAccount = accountState.getAccount(
      normalisedParams.accountStateKey,
    );

    if (!existingAccount) {
      throw new StateError(
        `Account state lost after successful transaction for account '${normalisedParams.accountId}'`,
      );
    }

    if (
      normalisedParams.newKeyRefId !== undefined &&
      normalisedParams.newPublicKey !== undefined
    ) {
      const updatedAccount: AccountData = {
        ...existingAccount,
        keyRefId: normalisedParams.newKeyRefId,
        publicKey: normalisedParams.newPublicKey,
        type: normalisedParams.newKeyType ?? existingAccount.type,
      };
      accountState.saveAccount(
        normalisedParams.accountStateKey,
        updatedAccount,
      );

      const aliasesForAccount = api.alias
        .list({ network: normalisedParams.network, type: AliasType.Account })
        .filter((rec) => rec.entityId === normalisedParams.accountId);

      for (const rec of aliasesForAccount) {
        api.alias.remove(rec.alias, normalisedParams.network);
        api.alias.register({
          ...rec,
          publicKey: normalisedParams.newPublicKey,
          keyRefId: normalisedParams.newKeyRefId,
        });
      }
    }

    const outputData: AccountUpdateOutput = {
      accountId: normalisedParams.accountId,
      network: normalisedParams.network,
      transactionId: executeTransactionResult.transactionId ?? '',
      updatedFields: normalisedParams.updatedFields,
    };

    return { result: outputData };
  }
}

export const accountUpdate = (
  args: CommandHandlerArgs,
): Promise<CommandResult> => new AccountUpdateCommand().execute(args);

import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { AccountData } from '@/plugins/account/schema';
import type { AccountCreateOutput } from './output';
import type {
  CreateBuildTransactionResult,
  CreateExecuteTransactionResult,
  CreateNormalisedParams,
  CreateSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { StateError, TransactionError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { HBAR_DECIMALS, KeyAlgorithm } from '@/core/shared/constants';
import { composeKey } from '@/core/utils/key-composer';
import { processBalanceInput } from '@/core/utils/process-balance-input';
import { buildEvmAddressFromAccountId } from '@/plugins/account/utils/account-address';
import { validateSufficientBalance } from '@/plugins/account/utils/account-validation';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

import { AccountCreateInputSchema } from './input';

export const ACCOUNT_CREATE_COMMAND_NAME = 'account_create';

export class AccountCreateCommand extends BaseTransactionCommand<
  CreateNormalisedParams,
  CreateBuildTransactionResult,
  CreateSignTransactionResult,
  CreateExecuteTransactionResult
> {
  constructor() {
    super(ACCOUNT_CREATE_COMMAND_NAME);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<CreateNormalisedParams> {
    const { api, logger } = args;

    const validArgs = AccountCreateInputSchema.parse(args.args);

    const balance = processBalanceInput(validArgs.balance, HBAR_DECIMALS);
    const maxAutoAssociations = validArgs.autoAssociations;
    const alias = validArgs.name;
    const name = alias;
    const keyManagerArg = validArgs.keyManager;
    const network = api.network.getCurrentNetwork();

    api.alias.availableOrThrow(alias, network);

  const keyManager =
    keyManagerArg || api.config.getOption<KeyManager>('default_key_manager');

    const operator = api.network.getCurrentOperatorOrThrow();
    const operatorBalance = await api.mirror.getAccountHBarBalance(
      operator.accountId,
    );
    validateSufficientBalance(operatorBalance, balance, operator.accountId);

    logger.info(`Creating account with name: ${alias}`);

    let keyRefId: string;
    let publicKey: string;
    let keyType: KeyAlgorithm;

    if (validArgs.key) {
      const resolved = await api.keyResolver.getPublicKey(
        validArgs.key,
        keyManager,
        ['account:create', `account:${name}`],
      );
      keyRefId = resolved.keyRefId;
      publicKey = resolved.publicKey;
      const kmsRecord = api.kms.get(keyRefId);
      if (!kmsRecord) {
        throw new StateError(`KMS record not found for keyRefId: ${keyRefId}`);
      }
      keyType = kmsRecord.keyAlgorithm;
    } else {
      keyType = validArgs.keyType ?? KeyAlgorithm.ECDSA;
      const created = api.kms.createLocalPrivateKey(keyType, keyManager, [
        'account:create',
        `account:${name}`,
      ]);
      keyRefId = created.keyRefId;
      publicKey = created.publicKey;
    }

    return {
      balance,
      maxAutoAssociations,
      alias,
      name,
      publicKey,
      keyRefId,
      keyType,
      network,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: CreateNormalisedParams,
  ): Promise<CreateBuildTransactionResult> {
    const { api } = args;
    return api.account.createAccount({
      balanceRaw: normalisedParams.balance,
      maxAutoAssociations: normalisedParams.maxAutoAssociations,
      publicKey: normalisedParams.publicKey,
    });
  }

  async signTransaction(
    args: CommandHandlerArgs,
    _normalisedParams: CreateNormalisedParams,
    buildTransactionResult: CreateBuildTransactionResult,
  ): Promise<CreateSignTransactionResult> {
    const { api } = args;
    const signedTransaction = await api.txSign.sign(
      buildTransactionResult.transaction,
      [],
    );
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    _normalisedParams: CreateNormalisedParams,
    _buildTransactionResult: CreateBuildTransactionResult,
    signTransactionResult: CreateSignTransactionResult,
  ): Promise<CreateExecuteTransactionResult> {
    const { api } = args;
    return api.txExecute.execute(signTransactionResult.signedTransaction);
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    normalisedParams: CreateNormalisedParams,
    buildTransactionResult: CreateBuildTransactionResult,
    _signTransactionResult: CreateSignTransactionResult,
    executeTransactionResult: CreateExecuteTransactionResult,
  ): Promise<CommandResult> {
    const { api, logger } = args;

    if (!executeTransactionResult.success) {
      throw new TransactionError(
        `Failed to create account (txId: ${executeTransactionResult.transactionId})`,
        false,
      );
    }

    if (!executeTransactionResult.accountId) {
      throw new StateError(
        'Transaction completed but did not return an account ID, unable to derive addresses',
      );
    }

    const evmAddress = buildEvmAddressFromAccountId(
      executeTransactionResult.accountId,
    );

    if (normalisedParams.alias) {
      api.alias.register({
        alias: normalisedParams.alias,
        type: AliasType.Account,
        network: normalisedParams.network,
        entityId: executeTransactionResult.accountId,
        evmAddress,
        publicKey: normalisedParams.publicKey,
        keyRefId: normalisedParams.keyRefId,
        createdAt: executeTransactionResult.consensusTimestamp,
      });
    }

    const accountData: AccountData = {
      name: normalisedParams.name,
      accountId: executeTransactionResult.accountId,
      type: normalisedParams.keyType,
      publicKey: buildTransactionResult.publicKey,
      evmAddress,
      keyRefId: normalisedParams.keyRefId,
      network: normalisedParams.network,
    };
    const accountKey = composeKey(
      normalisedParams.network,
      executeTransactionResult.accountId,
    );
    const accountState = new ZustandAccountStateHelper(api.state, logger);
    accountState.saveAccount(accountKey, accountData);

    const outputData: AccountCreateOutput = {
      accountId: accountData.accountId,
      name: accountData.name,
      type: accountData.type,
      network: accountData.network,
      transactionId: executeTransactionResult.transactionId || '',
      evmAddress,
      publicKey: accountData.publicKey,
    };

    return { result: outputData };
  }
}

export async function accountCreate(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new AccountCreateCommand().execute(args);
}

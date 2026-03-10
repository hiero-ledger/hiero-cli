import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { CreateAccountOutput } from './output';
import type {
  CreateAccountBuildTransactionResult,
  CreateAccountExecuteTransactionResult,
  CreateAccountNormalisedParams,
  CreateAccountSignTransactionResult,
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

import { CreateAccountInputSchema } from './input';

export class CreateAccountCommand extends BaseTransactionCommand<
  CreateAccountNormalisedParams,
  CreateAccountBuildTransactionResult,
  CreateAccountSignTransactionResult,
  CreateAccountExecuteTransactionResult
> {
  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<CreateAccountNormalisedParams> {
    const { api } = args;

    const validArgs = CreateAccountInputSchema.parse(args.args);

    const balance = processBalanceInput(validArgs.balance, HBAR_DECIMALS);
    const maxAutoAssociations = validArgs.autoAssociations;
    const alias = validArgs.name;
    const keyManagerArg = validArgs.keyManager;

    const network = api.network.getCurrentNetwork();
    api.alias.availableOrThrow(alias, network);

    const keyManager =
      keyManagerArg ||
      api.config.getOption<KeyManagerName>('default_key_manager');

    const operator = api.network.getCurrentOperatorOrThrow();
    const operatorBalance = await api.mirror.getAccountHBarBalance(
      operator.accountId,
    );
    validateSufficientBalance(operatorBalance, balance, operator.accountId);

    let keyRefId: string;
    let publicKey: string;
    let keyType: KeyAlgorithm;

    if (validArgs.key) {
      const resolved = await api.keyResolver.getPublicKey(
        validArgs.key,
        keyManager,
        ['account:create', `account:${alias}`],
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
        `account:${alias}`,
      ]);
      keyRefId = created.keyRefId;
      publicKey = created.publicKey;
    }

    return {
      balance,
      maxAutoAssociations,
      alias,
      keyRefId,
      publicKey,
      keyType,
      network,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    p: CreateAccountNormalisedParams,
  ): Promise<CreateAccountBuildTransactionResult> {
    const { api } = args;
    const accountCreateResult = api.account.createAccount({
      balanceRaw: p.balance,
      maxAutoAssociations: p.maxAutoAssociations,
      publicKey: p.publicKey,
    });
    return {
      transaction: accountCreateResult.transaction,
      publicKey: accountCreateResult.publicKey,
    };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    p: CreateAccountNormalisedParams,
    b: CreateAccountBuildTransactionResult,
  ): Promise<CreateAccountSignTransactionResult> {
    void args;
    void p;
    void b;
    return {};
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    p: CreateAccountNormalisedParams,
    b: CreateAccountBuildTransactionResult,
    s: CreateAccountSignTransactionResult,
  ): Promise<CreateAccountExecuteTransactionResult> {
    void p;
    void s;
    const result = await args.api.txExecution.signAndExecute(b.transaction);

    if (!result.success) {
      throw new TransactionError(
        `Failed to create account (txId: ${result.transactionId})`,
        false,
      );
    }

    if (!result.accountId) {
      throw new StateError(
        'Transaction completed but did not return an account ID, unable to derive addresses',
      );
    }

    return result;
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    p: CreateAccountNormalisedParams,
    b: CreateAccountBuildTransactionResult,
    s: CreateAccountSignTransactionResult,
    e: CreateAccountExecuteTransactionResult,
  ): Promise<CommandResult> {
    void s;
    const { api, logger } = args;
    const accountState = new ZustandAccountStateHelper(api.state, logger);

    const evmAddress = buildEvmAddressFromAccountId(e.accountId!);

    if (p.alias) {
      api.alias.register({
        alias: p.alias,
        type: AliasType.Account,
        network: p.network,
        entityId: e.accountId!,
        evmAddress,
        publicKey: b.publicKey,
        keyRefId: p.keyRefId,
        createdAt: e.consensusTimestamp,
      });
    }

    const accountKey = composeKey(p.network, e.accountId!);
    accountState.saveAccount(accountKey, {
      name: p.alias,
      accountId: e.accountId!,
      type: p.keyType,
      publicKey: b.publicKey,
      evmAddress,
      keyRefId: p.keyRefId,
      network: p.network,
    });

    const outputData: CreateAccountOutput = {
      accountId: e.accountId!,
      name: p.alias,
      type: p.keyType,
      network: p.network,
      transactionId: e.transactionId || '',
      evmAddress,
      publicKey: b.publicKey,
    };

    return { result: outputData };
  }
}

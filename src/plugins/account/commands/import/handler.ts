import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { ImportAccountOutput } from './output';
import type {
  ImportAccountBuildTransactionResult,
  ImportAccountExecuteTransactionResult,
  ImportAccountNormalisedParams,
  ImportAccountSignTransactionResult,
} from './types';

import { BaseTransactionCommand } from '@/core/commands/command';
import { StateError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { buildAccountEvmAddress } from '@/plugins/account/utils/account-address';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

import { ImportAccountInputSchema } from './input';

export class ImportAccountCommand extends BaseTransactionCommand<
  ImportAccountNormalisedParams,
  ImportAccountBuildTransactionResult,
  ImportAccountSignTransactionResult,
  ImportAccountExecuteTransactionResult
> {
  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<ImportAccountNormalisedParams> {
    const { api, logger } = args;
    const accountState = new ZustandAccountStateHelper(api.state, logger);

    const validArgs = ImportAccountInputSchema.parse(args.args);

    const key = validArgs.key;
    const alias = validArgs.name;
    const keyManagerArg = validArgs.keyManager;
    const accountId = key.accountId;
    const network = api.network.getCurrentNetwork();
    const accountKey = composeKey(network, accountId);

    if (accountState.hasAccount(accountKey)) {
      throw new StateError('Account with this ID is already saved in state');
    }

    api.alias.availableOrThrow(alias, network);

    const keyManager =
      keyManagerArg ||
      api.config.getOption<KeyManagerName>('default_key_manager');

    return { key, alias, keyManager, accountId, network, accountKey };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    p: ImportAccountNormalisedParams,
  ): Promise<ImportAccountBuildTransactionResult> {
    void args;
    void p;
    return {};
  }

  async signTransaction(
    args: CommandHandlerArgs,
    p: ImportAccountNormalisedParams,
    b: ImportAccountBuildTransactionResult,
  ): Promise<ImportAccountSignTransactionResult> {
    void args;
    void p;
    void b;
    return {};
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    p: ImportAccountNormalisedParams,
    b: ImportAccountBuildTransactionResult,
    s: ImportAccountSignTransactionResult,
  ): Promise<ImportAccountExecuteTransactionResult> {
    void b;
    void s;
    const { api } = args;

    const accountInfo = await api.mirror.getAccount(p.key.accountId);

    const { keyRefId, publicKey } = api.kms.importAndValidatePrivateKey(
      accountInfo.keyAlgorithm,
      p.key.privateKey,
      accountInfo.accountPublicKey,
      p.keyManager,
    );

    const evmAddress = buildAccountEvmAddress({
      accountId: p.accountId,
      publicKey,
      keyType: accountInfo.keyAlgorithm,
      existingEvmAddress: accountInfo.evmAddress,
    });

    return { keyRefId, publicKey, accountInfo, evmAddress };
  }

  async outputPreparation(
    args: CommandHandlerArgs,
    p: ImportAccountNormalisedParams,
    b: ImportAccountBuildTransactionResult,
    s: ImportAccountSignTransactionResult,
    e: ImportAccountExecuteTransactionResult,
  ): Promise<CommandResult> {
    void b;
    void s;
    const { api, logger } = args;
    const accountState = new ZustandAccountStateHelper(api.state, logger);

    if (p.alias) {
      api.alias.register({
        alias: p.alias,
        type: AliasType.Account,
        network: p.network,
        entityId: p.accountId,
        evmAddress: e.evmAddress,
        publicKey: e.publicKey,
        keyRefId: e.keyRefId,
        createdAt: new Date().toISOString(),
      });
    }

    accountState.saveAccount(p.accountKey, {
      name: p.alias,
      accountId: p.accountId,
      type: e.accountInfo.keyAlgorithm,
      publicKey: e.publicKey,
      evmAddress: e.evmAddress,
      keyRefId: e.keyRefId,
      network: p.network,
    });

    const outputData: ImportAccountOutput = {
      accountId: p.accountId,
      name: p.alias,
      type: e.accountInfo.keyAlgorithm,
      network: p.network,
      balance: BigInt(e.accountInfo.balance.balance.toString()),
      evmAddress: e.evmAddress,
    };

    return { result: outputData };
  }
}

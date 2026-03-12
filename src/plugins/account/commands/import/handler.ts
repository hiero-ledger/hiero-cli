import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { AccountData } from '@/plugins/account/schema';
import type { AccountImportOutput } from './output';

import { StateError, ValidationError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { buildAccountEvmAddress } from '@/plugins/account/utils/account-address';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

import { AccountImportInputSchema } from './input';

export class AccountImportCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const accountState = new ZustandAccountStateHelper(api.state, logger);

    const validArgs = AccountImportInputSchema.parse(args.args);

    const key = validArgs.key;
    const alias = validArgs.name;
    const keyManagerArg = validArgs.keyManager;
    const accountId = key.accountId;
    const network = api.network.getCurrentNetwork();
    const accountKey = composeKey(network, accountId);

    if (accountState.hasAccount(accountKey)) {
      throw new StateError('Account with this ID is already saved in state');
    }

    const keyManager =
      keyManagerArg || api.config.getOption<KeyManager>('default_key_manager');

    api.alias.availableOrThrow(alias, network);

    const accountInfo = await api.mirror.getAccount(key.accountId);

    const { keyRefId, publicKey } = api.kms.importAndValidatePrivateKey(
      accountInfo.keyAlgorithm,
      key.privateKey,
      accountInfo.accountPublicKey,
      keyManager,
    );

    logger.info(`Importing account: ${accountKey} (${accountId})`);

    if (accountState.hasAccount(accountKey)) {
      throw new ValidationError(
        `Account with identifier '${accountKey}' already exists`,
      );
    }

    const evmAddress = buildAccountEvmAddress({
      accountId,
      publicKey,
      keyType: accountInfo.keyAlgorithm,
      existingEvmAddress: accountInfo.evmAddress,
    });

    if (alias) {
      api.alias.register({
        alias,
        type: AliasType.Account,
        network: api.network.getCurrentNetwork(),
        entityId: accountId,
        evmAddress,
        publicKey,
        keyRefId,
        createdAt: new Date().toISOString(),
      });
    }

    const account: AccountData = {
      name: alias,
      accountId,
      type: accountInfo.keyAlgorithm,
      publicKey: publicKey,
      evmAddress,
      keyRefId,
      network: api.network.getCurrentNetwork(),
    };

    accountState.saveAccount(accountKey, account);

    const outputData: AccountImportOutput = {
      accountId,
      name: alias,
      type: account.type,
      network: account.network,
      balance: BigInt(accountInfo.balance.balance.toString()),
      evmAddress,
    };

    return { result: outputData };
  }
}

export const accountImport = (args: CommandHandlerArgs) =>
  new AccountImportCommand().execute(args);

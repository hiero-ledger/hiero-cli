import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { AccountData } from '@/plugins/account/schema';
import type { ImportAccountOutput } from './output';

import { StateError, ValidationError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { buildAccountEvmAddress } from '@/plugins/account/utils/account-address';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

import { ImportAccountInputSchema } from './input';

export class ImportAccountCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
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

    const keyManager =
      keyManagerArg ||
      api.config.getOption<KeyManagerName>('default_key_manager');

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

    const outputData: ImportAccountOutput = {
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

export const importAccount = (args: CommandHandlerArgs) =>
  new ImportAccountCommand().execute(args);

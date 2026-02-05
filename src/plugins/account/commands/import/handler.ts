/**
 * Account Import Command Handler
 * Handles importing existing accounts using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { AccountData } from '@/plugins/account/schema';
import type { ImportAccountOutput } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { buildAccountEvmAddress } from '@/plugins/account/utils/account-address';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

import { ImportAccountInputSchema } from './input';

export async function importAccount(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Initialize Zustand state helper
  const accountState = new ZustandAccountStateHelper(api.state, logger);

  // Parse and validate command arguments
  const validArgs = ImportAccountInputSchema.parse(args.args);

  const key = validArgs.key;
  const alias = validArgs.name;
  const keyManagerArg = validArgs.keyManager;
  const accountId = key.accountId;

  // Check if name already exists on the current network
  const network = api.network.getCurrentNetwork();

  // Get keyManager from args or fallback to config
  const keyManager =
    keyManagerArg ||
    api.config.getOption<KeyManagerName>('default_key_manager');

  try {
    // Check if account name already exists
    api.alias.availableOrThrow(alias, network);

    // Get account info from mirror node
    const accountInfo = await api.mirror.getAccount(key.accountId);

    const { keyRefId, publicKey } = api.kms.importAndValidatePrivateKey(
      accountInfo.keyAlgorithm,
      key.privateKey,
      accountInfo.accountPublicKey,
      keyManager,
    );

    // Generate a unique name for the account
    const name = alias || `imported-${accountId.replace(/\./g, '-')}`;
    logger.info(`Importing account: ${name} (${accountId})`);

    // Check if account name already exists
    if (accountState.hasAccount(name)) {
      return {
        status: Status.Failure,
        errorMessage: `Account with name '${name}' already exists`,
      };
    }

    // Register name if provided
    if (alias) {
      api.alias.register({
        alias,
        type: 'account',
        network: api.network.getCurrentNetwork(),
        entityId: accountId,
        publicKey,
        keyRefId,
        createdAt: new Date().toISOString(),
      });
    }

    const evmAddress = buildAccountEvmAddress({
      accountId,
      publicKey,
      keyType: accountInfo.keyAlgorithm,
      existingEvmAddress: accountInfo.evmAddress,
    });

    // Create account object (no private key in plugin state)
    const account: AccountData = {
      name,
      accountId,
      type: accountInfo.keyAlgorithm,
      publicKey: publicKey,
      evmAddress,
      keyRefId,
      network: api.network.getCurrentNetwork(),
    };

    // Store account in state using the helper
    accountState.saveAccount(name, account);

    // Prepare output data
    const outputData: ImportAccountOutput = {
      accountId,
      name: account.name,
      type: account.type,
      ...(alias && { alias }),
      network: account.network,
      balance: String(accountInfo.balance.balance),
      evmAddress,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to import account', error),
    };
  }
}

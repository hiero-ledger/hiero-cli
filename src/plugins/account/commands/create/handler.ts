/**
 * Account Create Command Handler
 * Handles account creation using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { AccountData } from '@/plugins/account/schema';
import type { CreateAccountOutput } from './output';

import { ConfigurationError, NetworkError, ValidationError } from '@/core';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { HBAR_DECIMALS, KeyAlgorithm } from '@/core/shared/constants';
import { processBalanceInput } from '@/core/utils/process-balance-input';
import { buildAccountEvmAddress } from '@/plugins/account/utils/account-address';
import { validateSufficientBalance } from '@/plugins/account/utils/account-validation';
import { ZustandAccountStateHelper } from '@/plugins/account/zustand-state-helper';

import { CreateAccountInputSchema } from './input';

export async function createAccount(
  args: CommandHandlerArgs,
): Promise<CommandResult<CreateAccountOutput>> {
  const { api, logger } = args;

  const accountState = new ZustandAccountStateHelper(api.state, logger);

  const validArgs = CreateAccountInputSchema.parse(args.args);

  const rawBalance = validArgs.balance;
  let balance: bigint;

  balance = processBalanceInput(rawBalance, HBAR_DECIMALS);

  const maxAutoAssociations = validArgs.autoAssociations;
  const alias = validArgs.name;
  const keyManagerArg = validArgs.keyManager;
  const keyTypeArg = validArgs.keyType;

  if (
    keyTypeArg !== KeyAlgorithm.ECDSA &&
    keyTypeArg !== KeyAlgorithm.ED25519
  ) {
    throw new ValidationError(
      `Invalid key type: ${String(keyTypeArg)}. Must be '${KeyAlgorithm.ECDSA}' or '${KeyAlgorithm.ED25519}'.`,
    );
  }

  const keyType = keyTypeArg;

  const network = api.network.getCurrentNetwork();
  api.alias.availableOrThrow(alias, network);

  const keyManager =
    keyManagerArg ||
    api.config.getOption<KeyManagerName>('default_key_manager');

  const operator = api.network.getOperator(network);
  if (!operator) {
    throw new ConfigurationError(
      'No operator account configured. ' +
        'Please configure operator credentials before creating accounts.',
    );
  }

  const operatorBalance = await api.mirror.getAccountHBarBalance(
    operator.accountId,
  );

  validateSufficientBalance(operatorBalance, balance, operator.accountId);

  const name = alias || `account-${Date.now()}`;

  logger.info(`Creating account with name: ${alias}`);

  const { keyRefId, publicKey } = api.kms.createLocalPrivateKey(
    keyType,
    keyManager,
    ['account:create', `account:${name}`],
  );

  const accountCreateResult = await api.account.createAccount({
    balanceRaw: balance,
    maxAutoAssociations,
    publicKey,
    keyType,
  });

  const result = await api.txExecution.signAndExecute(
    accountCreateResult.transaction,
  );

  if (!result.success) {
    throw new NetworkError('Failed to create account (transaction failed)', {
      context: { transactionId: result.transactionId },
    });
  }

  if (alias) {
    api.alias.register({
      alias,
      type: ALIAS_TYPE.Account,
      network,
      entityId: result.accountId,
      publicKey,
      keyRefId,
      createdAt: result.consensusTimestamp,
    });
  }

  if (!result.accountId) {
    throw new Error(
      'Transaction completed but did not return an account ID, unable to derive addresses',
    );
  }

  const evmAddress = buildAccountEvmAddress({
    accountId: result.accountId,
    publicKey: accountCreateResult.publicKey,
    keyType,
  });

  const accountData: AccountData = {
    name,
    accountId: result.accountId,
    type: keyType as KeyAlgorithm, // Temporary solution, to fix after PoC
    publicKey: accountCreateResult.publicKey,
    evmAddress,
    keyRefId,
    network: api.network.getCurrentNetwork() as AccountData['network'], // Temporary solution, to fix after PoC
  };

  accountState.saveAccount(name, accountData);

  const outputData: CreateAccountOutput = {
    accountId: accountData.accountId,
    name: accountData.name,
    type: accountData.type,
    ...(alias && { alias }),
    network: accountData.network,
    transactionId: result.transactionId || '',
    evmAddress,
    publicKey: accountData.publicKey,
  };

  return {
    result: outputData,
  };
}

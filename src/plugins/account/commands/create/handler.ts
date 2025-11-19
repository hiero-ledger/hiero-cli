/**
 * Account Create Command Handler
 * Handles account creation using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { Status } from '../../../../core/shared/constants';
import type { AccountData } from '../../schema';
import { AliasType } from '../../../../core/services/alias/alias-service.interface';
import { formatError } from '../../../../core/utils/errors';
import { ZustandAccountStateHelper } from '../../zustand-state-helper';
import { processBalanceInput } from '../../../../core/utils/process-balance-input';
import { CreateAccountOutput } from './output';
import { Hbar } from '@hashgraph/sdk';
import type { KeyAlgorithmType as KeyAlgorithmType } from '../../../../core/services/kms/kms-types.interface';
import { KeyAlgorithm } from '../../../../core/shared/constants';
import { KeyManagerName } from '../../../../core/services/kms/kms-types.interface';

/**
 * Validates that an account has sufficient balance for an operation.
 * This is a pure validation function with no external dependencies.
 *
 * @param availableBalance - Available balance in tinybars
 * @param requiredBalance - Required balance in tinybars
 * @param accountId - Context for error message
 * @throws Error if balance is insufficient
 */
function validateSufficientBalance(
  availableBalance: bigint,
  requiredBalance: bigint,
  accountId: string,
): void {
  const isBalanceSufficient = availableBalance > requiredBalance;

  if (!isBalanceSufficient) {
    // Convert to HBAR only for display purposes
    const requiredHbar = Hbar.fromTinybars(requiredBalance).toString();
    const availableHbar = Hbar.fromTinybars(availableBalance).toString();

    throw new Error(
      `Insufficient balance in account ${accountId}.\n` +
        `   Required balance:  ${requiredHbar}\n` +
        `   Available balance: ${availableHbar}`,
    );
  }
}

export async function createAccount(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // Initialize Zustand state helper
  const accountState = new ZustandAccountStateHelper(api.state, logger);

  // Extract command arguments
  const rawBalance = args.args.balance as string;
  let balance: bigint;

  try {
    // Convert balance input: display units (default) or base units (with 't' suffix)
    // HBAR uses 8 decimals
    // @TODO Ensure every balance variable is typeof bigint
    balance = processBalanceInput(rawBalance, 8);
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Invalid balance parameter', error),
    };
  }

  const maxAutoAssociations = (args.args['auto-associations'] as number) || 0;
  const alias = (args.args.name as string) || '';
  const keyManagerArg = args.args.keyManager as KeyManagerName | undefined;
  const keyTypeArg = (args.args.keyType as string) || KeyAlgorithm.ECDSA;

  // Validate key type
  if (
    keyTypeArg !== KeyAlgorithm.ECDSA.valueOf() &&
    keyTypeArg !== KeyAlgorithm.ED25519.valueOf()
  ) {
    return {
      status: Status.Failure,
      errorMessage: `Invalid key type: ${keyTypeArg}. Must be '${KeyAlgorithm.ECDSA}' or '${KeyAlgorithm.ED25519}'.`,
    };
  }

  const keyType: KeyAlgorithmType = keyTypeArg as KeyAlgorithmType;

  // Check if alias already exists on the current network
  const network = api.network.getCurrentNetwork();
  api.alias.availableOrThrow(alias, network);

  // Get keyManager from args or fallback to config
  const keyManager =
    keyManagerArg ||
    api.config.getOption<KeyManagerName>('default_key_manager');

  // Check operator account and fetch balance
  const operator = api.network.getOperator(network);
  if (!operator) {
    throw new Error(
      'No operator account configured. ' +
        'Please configure operator credentials before creating accounts.',
    );
  }

  const operatorBalance = await api.mirror.getAccountHBarBalance(
    operator.accountId,
  );

  // Validate operator has sufficient balance to create the account
  validateSufficientBalance(operatorBalance, balance, operator.accountId);

  const name = alias || `account-${Date.now()}`;

  // Generate a unique name for the account
  logger.log(`Creating account with name: ${alias}`);

  try {
    // 1. Generate a new key pair for the account
    const { keyRefId, publicKey } = api.kms.createLocalPrivateKey(
      keyType,
      keyManager,
      ['account:create', `account:${name}`],
    );

    // 2. Create transaction using Core API
    const accountCreateResult = await api.account.createAccount({
      balanceRaw: balance,
      maxAutoAssociations,
      publicKey,
      keyType,
    });

    // 2. Sign and execute transaction with default operator
    const result = await api.txExecution.signAndExecute(
      accountCreateResult.transaction,
    );

    if (result.success) {
      // 4. Optionally register alias for the new account (per-network)
      if (alias) {
        api.alias.register({
          alias,
          type: AliasType.Account,
          network,
          entityId: result.accountId,
          publicKey,
          keyRefId,
          createdAt: new Date().toISOString(),
        });
      }

      // 5. Store account metadata in plugin state (no private key)
      const accountData: AccountData = {
        name,
        accountId: result.accountId || '0.0.123456',
        type: keyType as KeyAlgorithm,
        publicKey: accountCreateResult.publicKey,
        evmAddress: accountCreateResult.evmAddress,
        solidityAddress: accountCreateResult.evmAddress,
        solidityAddressFull: accountCreateResult.evmAddress,
        keyRefId,
        network: api.network.getCurrentNetwork() as AccountData['network'],
      };

      accountState.saveAccount(name, accountData);

      // Prepare output data
      const outputData: CreateAccountOutput = {
        accountId: accountData.accountId,
        name: accountData.name,
        type: accountData.type,
        ...(alias && { alias }),
        network: accountData.network,
        transactionId: result.transactionId || '',
        evmAddress: accountData.evmAddress,
        publicKey: accountData.publicKey,
      };

      return {
        status: Status.Success,
        outputJson: JSON.stringify(outputData),
      };
    } else {
      return {
        status: Status.Failure,
        errorMessage: 'Failed to create account',
      };
    }
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to create account', error),
    };
  }
}

/**
 * Quickstart Accounts Command Handler
 * Creates multiple test accounts with specified balance distribution
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { AccountsOutput, CreatedAccount } from './output';

import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { HBAR_DECIMALS, KeyAlgorithm, Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { processBalanceInput } from '@/core/utils/process-balance-input';

import { AccountsInputSchema } from './input';

const MAX_ACCOUNTS = 10;

export async function accountsHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const validArgs = AccountsInputSchema.parse(args.args);
  const count = Math.min(validArgs.count, MAX_ACCOUNTS);
  const prefix = validArgs.prefix;
  const rawBalance = validArgs.balance;

  if (count < 1) {
    return {
      status: Status.Failure,
      errorMessage: 'Account count must be at least 1',
    };
  }

  if (count > MAX_ACCOUNTS) {
    logger.warn(`Account count limited to ${MAX_ACCOUNTS}`);
  }

  let balancePerAccount: bigint;
  try {
    balancePerAccount = processBalanceInput(rawBalance, HBAR_DECIMALS);
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Invalid balance parameter', error),
    };
  }

  const network = api.network.getCurrentNetwork();
  const operator = api.network.getOperator(network);

  if (!operator) {
    return {
      status: Status.Failure,
      errorMessage:
        'No operator configured. Run "hiero quickstart init" first.',
    };
  }

  logger.info(`Creating ${count} accounts with ${rawBalance} HBAR each...`);

  try {
    // Check operator has enough balance
    const operatorBalance = await api.mirror.getAccountHBarBalance(
      operator.accountId,
    );
    const totalNeeded = balancePerAccount * BigInt(count);
    const buffer = processBalanceInput('1', HBAR_DECIMALS); // 1 HBAR buffer for fees

    if (operatorBalance < totalNeeded + buffer) {
      const neededHbar = Number(totalNeeded) / 100_000_000;
      const haveHbar = Number(operatorBalance) / 100_000_000;
      return {
        status: Status.Failure,
        errorMessage: `Insufficient operator balance. Need ~${neededHbar.toFixed(2)} HBAR + fees, have ${haveHbar.toFixed(2)} HBAR.`,
      };
    }

    const createdAccounts: CreatedAccount[] = [];
    let totalDistributed = BigInt(0);

    for (let i = 1; i <= count; i++) {
      const accountName = `${prefix}-${i}`;
      const timestamp = Date.now();

      logger.info(`Creating account ${i}/${count}: ${accountName}`);

      // Check if name is available
      try {
        api.alias.availableOrThrow(accountName, network);
      } catch {
        logger.warn(`Name "${accountName}" already exists, using timestamp`);
        continue;
      }

      // Create key pair
      const keyType = KeyAlgorithm.ED25519;
      const { keyRefId, publicKey } = api.kms.createLocalPrivateKey(
        keyType,
        'local',
        ['account:create', `account:${accountName}`],
      );

      // Create account transaction
      const accountCreateResult = await api.account.createAccount({
        balanceRaw: balancePerAccount,
        maxAutoAssociations: 10,
        publicKey,
        keyType,
      });

      // Execute the transaction
      const result = await api.txExecution.signAndExecute(
        accountCreateResult.transaction,
      );

      if (result.success && result.accountId) {
        // Register the alias
        api.alias.register({
          alias: accountName,
          type: ALIAS_TYPE.Account,
          network,
          entityId: result.accountId,
          publicKey,
          keyRefId,
          createdAt: result.consensusTimestamp,
        });

        const balanceHbar = Number(balancePerAccount) / 100_000_000;
        createdAccounts.push({
          name: accountName,
          accountId: result.accountId,
          balance: balanceHbar.toFixed(2),
          publicKey: publicKey.substring(0, 20) + '...',
        });

        totalDistributed += balancePerAccount;
        logger.info(`Created: ${accountName} -> ${result.accountId}`);
      } else {
        logger.warn(`Failed to create account ${accountName}`);
      }
    }

    if (createdAccounts.length === 0) {
      return {
        status: Status.Failure,
        errorMessage: 'Failed to create any accounts',
      };
    }

    const totalHbar = Number(totalDistributed) / 100_000_000;

    const output: AccountsOutput = {
      count: createdAccounts.length,
      totalCost: totalHbar.toFixed(2),
      network,
      accounts: createdAccounts,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to create accounts', error),
    };
  }
}

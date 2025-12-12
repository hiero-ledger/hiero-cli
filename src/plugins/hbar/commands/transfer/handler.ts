/**
 * HBAR Transfer Command Handler
 * Handles HBAR transfers using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import { EntityIdSchema } from '@/core/schemas';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import { HBAR_DECIMALS, Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { processBalanceInput } from '@/core/utils/process-balance-input';

import { TransferInputSchema } from './input';
import type { TransferOutput } from './output';

export async function transferHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  logger.info('[HBAR] Transfer command invoked');

  try {
    // Parse and validate args
    const validArgs = TransferInputSchema.parse(args.args);

    const to = validArgs.to;
    const fromArg = validArgs.from;
    const memo = validArgs.memo;

    // Get keyManager from args or fallback to config
    const providedKeyManager = validArgs.keyManager;
    const keyManager =
      providedKeyManager ||
      api.config.getOption<KeyManagerName>('default_key_manager');

    // Resolve from arg
    const from = await api.keyResolver.getOrInitKeyWithFallback(
      fromArg,
      keyManager,
      ['hbar:transfer'],
    );
    let amount: bigint;

    try {
      // Convert amount input: display units (default) or base units (with 't' suffix)
      amount = processBalanceInput(validArgs.amount, HBAR_DECIMALS);
    } catch {
      return {
        status: Status.Failure,
        errorMessage: 'Invalid amount input',
      };
    }

    const currentNetwork = api.network.getCurrentNetwork();

    let toAccountId = to;

    const toAlias = api.alias.resolve(to, 'account', currentNetwork);

    if (toAlias && toAlias.entityId) {
      toAccountId = toAlias.entityId;
    } else if (EntityIdSchema.safeParse(to).success) {
      toAccountId = to;
    } else {
      return {
        status: Status.Failure,
        errorMessage: `Invalid to account: ${to} is neither a valid account ID nor a known alias`,
      };
    }

    // Check if from and to are the same account
    if (from.accountId === toAccountId) {
      return {
        status: Status.Failure,
        errorMessage: 'Cannot transfer to the same account',
      };
    }

    logger.info(
      `[HBAR] Transferring ${amount.toString()} tinybars from ${from.accountId} to ${toAccountId}`,
    );

    const transferResult = await api.hbar.transferTinybar({
      amount: amount,
      from: from.accountId,
      to: toAccountId,
      memo,
    });

    const result = await api.txExecution.signAndExecuteWith(
      transferResult.transaction,
      [from.keyRefId],
    );

    if (!result.success) {
      return {
        status: Status.Failure,
        errorMessage: `Transfer failed: ${result.receipt?.status?.status ?? 'UNKNOWN'}`,
      };
    }

    logger.info(
      `[HBAR] Transfer submitted successfully, txId=${result.transactionId}`,
    );

    const outputData: TransferOutput = {
      transactionId: result.transactionId || '',
      fromAccountId: from.accountId,
      toAccountId,
      amountTinybar: BigInt(amount.toString()),
      network: currentNetwork,
      ...(memo && { memo }),
      ...(result.receipt?.status && {
        status: result.receipt.status.status,
      }),
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Transfer failed', error),
    };
  }
}

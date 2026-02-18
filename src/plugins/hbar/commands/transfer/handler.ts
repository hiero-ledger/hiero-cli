import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { TransferOutput } from './output';

import { TransactionError, ValidationError } from '@/core/errors';
import { EntityIdSchema } from '@/core/schemas';
import { HBAR_DECIMALS } from '@/core/shared/constants';
import { processBalanceInput } from '@/core/utils/process-balance-input';

import { TransferInputSchema } from './input';

export async function transferHandler(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  logger.info('[HBAR] Transfer command invoked');

  const validArgs = TransferInputSchema.parse(args.args);

  const to = validArgs.to;
  const fromArg = validArgs.from;
  const memo = validArgs.memo;

  const providedKeyManager = validArgs.keyManager;
  const keyManager =
    providedKeyManager ||
    api.config.getOption<KeyManagerName>('default_key_manager');

  const from = await api.keyResolver.getOrInitKeyWithFallback(
    fromArg,
    keyManager,
    ['hbar:transfer'],
  );

  const amount = processBalanceInput(validArgs.amount, HBAR_DECIMALS);

  const currentNetwork = api.network.getCurrentNetwork();

  let toAccountId = to;

  const toAlias = api.alias.resolve(to, 'account', currentNetwork);

  if (toAlias && toAlias.entityId) {
    toAccountId = toAlias.entityId;
  } else if (EntityIdSchema.safeParse(to).success) {
    toAccountId = to;
  } else {
    throw new ValidationError(
      `Invalid to account: ${to} is neither a valid account ID nor a known alias`,
    );
  }

  if (from.accountId === toAccountId) {
    throw new ValidationError('Cannot transfer to the same account');
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
    throw new TransactionError(
      `Transfer failed: ${result.receipt?.status?.status ?? 'UNKNOWN'}`,
      { recoverable: false },
    );
  }

  logger.info(
    `[HBAR] Transfer submitted successfully, txId=${result.transactionId}`,
  );

  const outputData: TransferOutput = {
    transactionId: result.transactionId || '',
    fromAccountId: from.accountId,
    toAccountId,
    amountTinybar: amount,
    network: currentNetwork,
    ...(memo && { memo }),
    ...(result.receipt?.status && {
      status: result.receipt.status.status,
    }),
  };

  return { result: outputData };
}

import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { TransferOutput } from './output';

import { TransactionError, ValidationError } from '@/core/errors';
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
  const from = validArgs.from;
  const memo = validArgs.memo;

  const providedKeyManager = validArgs.keyManager;
  const keyManager =
    providedKeyManager ||
    api.config.getOption<KeyManagerName>('default_key_manager');

  const amount = processBalanceInput(validArgs.amount, HBAR_DECIMALS);

  const currentNetwork = api.network.getCurrentNetwork();

  // Resolve accounts
  const fromAccount = await api.keyResolver.resolveSigningKey(from, keyManager);
  const toAccount = await api.keyResolver.resolveDestination(to, keyManager);

  // In resolved destination at least one field is present
  const destination = toAccount.evmAddress || <string>toAccount.accountId;

  if (fromAccount.accountId === toAccount.accountId) {
    throw new ValidationError('Cannot transfer to the same account');
  }

  logger.info(
    `[HBAR] Transferring ${amount.toString()} tinybars from ${fromAccount.accountId} to ${toAccount.accountId}`,
  );

  const transferResult = await api.hbar.transferTinybar({
    amount: amount,
    from: fromAccount.accountId,
    to: destination,
    memo,
  });

  const result = await api.txExecution.signAndExecuteWith(
    transferResult.transaction,
    [fromAccount.keyRefId],
  );

  if (!result.success) {
    throw new TransactionError(
      `Transfer failed from ${fromAccount.accountId} to ${destination} (txId: ${result.transactionId}, status: ${result.receipt?.status?.status ?? 'UNKNOWN'})`,
      false,
    );
  }

  logger.info(
    `[HBAR] Transfer submitted successfully, txId=${result.transactionId}`,
  );

  const outputData: TransferOutput = {
    transactionId: result.transactionId || '',
    fromAccountId: fromAccount.accountId,
    toAccountId: destination,
    amountTinybar: amount,
    network: currentNetwork,
    ...(memo && { memo }),
    ...(result.receipt?.status && {
      status: result.receipt.status.status,
    }),
  };

  return { result: outputData };
}

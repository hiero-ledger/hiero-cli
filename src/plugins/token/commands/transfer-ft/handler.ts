import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { TransferFungibleTokenOutput } from './output';

import { NotFoundError, TransactionError } from '@/core/errors';
import { processBalanceInput } from '@/core/utils/process-balance-input';
import {
  resolveDestinationAccountParameter,
  resolveTokenParameter,
} from '@/plugins/token/resolver-helper';
import { isRawUnits } from '@/plugins/token/utils/token-amount-helpers';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { TransferFungibleTokenInputSchema } from './input';

export async function transferToken(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  const validArgs = TransferFungibleTokenInputSchema.parse(args.args);

  const tokenIdOrAlias = validArgs.token;
  const from = validArgs.from;
  const to = validArgs.to;
  const keyManagerArg = validArgs.keyManager;

  const keyManager =
    keyManagerArg ||
    api.config.getOption<KeyManagerName>('default_key_manager');

  const network = api.network.getCurrentNetwork();

  const resolvedToken = resolveTokenParameter(tokenIdOrAlias, api, network);

  if (!resolvedToken) {
    throw new NotFoundError(`Token not found: ${tokenIdOrAlias}`, {
      context: { tokenIdOrAlias },
    });
  }

  const tokenId = resolvedToken.tokenId;

  const userAmountInput = validArgs.amount;

  let tokenDecimals = 0;
  if (!isRawUnits(userAmountInput)) {
    const tokenInfoStorage = tokenState.getToken(tokenId);

    if (tokenInfoStorage) {
      tokenDecimals = tokenInfoStorage.decimals;
    } else {
      const tokenInfoMirror = await api.mirror.getTokenInfo(tokenId);
      tokenDecimals = parseInt(tokenInfoMirror.decimals) || 0;
    }
  }

  const rawAmount = processBalanceInput(userAmountInput, tokenDecimals);

  const resolvedFromAccount = await api.keyResolver.getOrInitKeyWithFallback(
    from,
    keyManager,
    ['token:account'],
  );

  const fromAccountId = resolvedFromAccount.accountId;
  const signerKeyRefId = resolvedFromAccount.keyRefId;

  logger.info(`🔑 Using from account: ${fromAccountId}`);
  logger.info(`🔑 Will sign with from account key`);

  const resolvedToAccount = resolveDestinationAccountParameter(
    to,
    api,
    network,
  );

  if (!resolvedToAccount) {
    throw new NotFoundError(`Destination account not found: ${to}`, {
      context: { to },
    });
  }

  const toAccountId = resolvedToAccount.accountId;

  logger.info(
    `Transferring ${rawAmount.toString()} tokens of ${tokenId} from ${fromAccountId} to ${toAccountId}`,
  );

  const transferTransaction = api.token.createTransferTransaction({
    tokenId,
    fromAccountId,
    toAccountId,
    amount: rawAmount,
  });

  logger.debug(`Using key ${signerKeyRefId} for signing transaction`);
  const result = await api.txExecution.signAndExecuteWith(transferTransaction, [
    signerKeyRefId,
  ]);

  if (!result.success) {
    throw new TransactionError('Fungible token transfer failed', false, {
      context: { tokenId, from: fromAccountId, to: toAccountId },
    });
  }

  const outputData: TransferFungibleTokenOutput = {
    transactionId: result.transactionId,
    tokenId,
    from: fromAccountId,
    to: toAccountId,
    amount: BigInt(rawAmount.toString()),
    network,
  };

  return { result: outputData };
}

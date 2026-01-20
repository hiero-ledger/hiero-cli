/**
 * Token Transfer Command Handler
 * Handles token transfer operations using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { TransferTokenOutput } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { processBalanceInput } from '@/core/utils/process-balance-input';
import {
  resolveDestinationAccountParameter,
  resolveTokenParameter,
} from '@/plugins/token/resolver-helper';
import { isRawUnits } from '@/plugins/token/utils/token-amount-helpers';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { TransferTokenInputSchema } from './input';

export async function transferToken(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  // Validate command parameters
  const validArgs = TransferTokenInputSchema.parse(args.args);

  // Use validated parameters
  const tokenIdOrAlias = validArgs.token;
  const from = validArgs.from;
  const to = validArgs.to;
  const keyManagerArg = validArgs.keyManager;

  // Get keyManager from args or fallback to config
  const keyManager =
    keyManagerArg ||
    api.config.getOption<KeyManagerName>('default_key_manager');

  const network = api.network.getCurrentNetwork();

  // Resolve token ID from alias if provided
  const resolvedToken = resolveTokenParameter(tokenIdOrAlias, api, network);

  if (!resolvedToken) {
    throw new Error(
      `Failed to resolve token parameter: ${tokenIdOrAlias}. ` +
        `Expected format: token-name OR token-id`,
    );
  }

  const tokenId = resolvedToken.tokenId;

  const userAmountInput = validArgs.amount;

  let tokenDecimals = 0;
  if (!isRawUnits(userAmountInput)) {
    try {
      const tokenInfoStorage = tokenState.getToken(tokenId);

      if (tokenInfoStorage) {
        tokenDecimals = tokenInfoStorage.decimals;
      } else {
        const tokenInfoMirror = await api.mirror.getTokenInfo(tokenId);
        tokenDecimals = parseInt(tokenInfoMirror.decimals) || 0;
      }
    } catch (error) {
      return {
        status: Status.Failure,
        errorMessage: formatError(
          `Failed to fetch token decimals for ${tokenId}`,
          error,
        ),
      };
    }
  }

  const rawAmount = processBalanceInput(userAmountInput, tokenDecimals);

  const resolvedFromAccount = await api.keyResolver.getOrInitKeyWithFallback(
    from,
    keyManager,
    ['token:account'],
  );

  // Use resolved from account from alias or account-id:private-key
  const fromAccountId = resolvedFromAccount.accountId;
  const signerKeyRefId = resolvedFromAccount.keyRefId;

  logger.info(`🔑 Using from account: ${fromAccountId}`);
  logger.info(`🔑 Will sign with from account key`);

  // Resolve to parameter (alias or account-id)
  const resolvedToAccount = resolveDestinationAccountParameter(
    to,
    api,
    network,
  );

  // To account was explicitly provided - it MUST resolve or fail
  if (!resolvedToAccount) {
    throw new Error(
      `Failed to resolve to account parameter: ${to}. ` +
        `Expected format: account-name OR account-id`,
    );
  }

  const toAccountId = resolvedToAccount.accountId;

  logger.info(
    `Transferring ${rawAmount.toString()} tokens of ${tokenId} from ${fromAccountId} to ${toAccountId}`,
  );

  try {
    // 1. Create transfer transaction using Core API
    // Convert display units to base token units
    const transferTransaction = api.token.createTransferTransaction({
      tokenId,
      fromAccountId,
      toAccountId,
      amount: rawAmount,
    });

    // Sign and execute using the from account key
    logger.debug(`Using key ${signerKeyRefId} for signing transaction`);
    const result = await api.txExecution.signAndExecuteWith(
      transferTransaction,
      [signerKeyRefId],
    );

    if (result.success) {
      // 3. Optionally update token state if needed
      // (e.g., update associations, balances, etc.)

      // Prepare output data
      const outputData: TransferTokenOutput = {
        transactionId: result.transactionId,
        tokenId,
        from: fromAccountId,
        to: toAccountId,
        amount: BigInt(rawAmount.toString()),
        network,
      };

      return {
        status: Status.Success,
        outputJson: JSON.stringify(outputData),
      };
    } else {
      return {
        status: Status.Failure,
        errorMessage: 'Token transfer failed',
      };
    }
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to transfer token', error),
    };
  }
}

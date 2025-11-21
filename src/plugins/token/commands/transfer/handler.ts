/**
 * Token Transfer Command Handler
 * Handles token transfer operations using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core/plugins/plugin.interface';
import { CommandExecutionResult } from '../../../../core/plugins/plugin.types';
import { Status } from '../../../../core/shared/constants';
import { safeValidateTokenTransferParams } from '../../schema';
import {
  resolveAccountParameter,
  resolveDestinationAccountParameter,
  resolveTokenParameter,
} from '../../resolver-helper';
import { formatError } from '../../../../core/utils/errors';
import { processBalanceInput } from '../../../../core/utils/process-balance-input';
import { ZustandTokenStateHelper } from '../../zustand-state-helper';
import { TransferTokenOutput } from './output';
import { KeyManagerName } from '../../../../core/services/kms/kms-types.interface';

export async function transferToken(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  // Validate command parameters
  const validationResult = safeValidateTokenTransferParams(args.args);
  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map(
      (error) => `${error.path.join('.')}: ${error.message}`,
    );
    return {
      status: Status.Failure,
      errorMessage: `Invalid command parameters:\n${errorMessages.join('\n')}`,
    };
  }

  // Use validated parameters
  const validatedParams = validationResult.data;
  const tokenIdOrAlias = validatedParams.token;
  const from = validatedParams.from;
  const to = validatedParams.to;
  const keyManagerArg = args.args.keyManager as KeyManagerName | undefined;

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

  // Get token decimals from API (needed for amount conversion)
  let tokenDecimals = 0;
  const userAmountInput = validatedParams.amount;

  // Only fetch decimals if user input doesn't have 't' suffix (raw units)
  const isRawUnits = String(userAmountInput).trim().endsWith('t');
  if (!isRawUnits) {
    try {
      const tokenInfoStorage = tokenState.getToken(tokenId);

      if (tokenInfoStorage) {
        tokenDecimals = tokenInfoStorage.decimals;
      } else {
        const tokenInfoMirror = await api.mirror.getTokenInfo(tokenId);
        tokenDecimals = parseInt(tokenInfoMirror.decimals) || 0;
      }

      const tokenInfo = await api.mirror.getTokenInfo(tokenId);
      tokenDecimals = parseInt(tokenInfo.decimals) || 0;
    } catch (error) {
      logger.error(`Failed to fetch token decimals for ${tokenId}`);
      process.exit(1);
    }
  }

  // Convert amount input: display units (default) or raw units (with 't' suffix)
  const rawAmount = processBalanceInput(userAmountInput, tokenDecimals);

  // Resolve from parameter (name or account-id:private-key) if provided

  let resolvedFromAccount = resolveAccountParameter(
    from,
    api,
    network,
    keyManager,
  );

  // If from account wasn't provided, use operator as default
  if (!resolvedFromAccount) {
    const operator = api.network.getOperator(network);

    if (!operator) {
      throw new Error('No from account provided and no default operator set.');
    }

    const operatorPublicKey = api.kms.getPublicKey(operator.keyRefId);

    if (!operatorPublicKey) {
      // This should not happen - credentials state should ensure operator keys exist
      throw new Error(
        'No from account provided and cant resolve public key of default operator set.',
      );
    }

    logger.log("No 'from' account provided, using default operator account.");

    resolvedFromAccount = {
      accountId: operator.accountId,
      accountKeyRefId: operator.keyRefId,
      accountPublicKey: operatorPublicKey,
    };
  }

  // Use resolved from account from alias or account-id:private-key
  const fromAccountId = resolvedFromAccount.accountId;
  const signerKeyRefId = resolvedFromAccount.accountKeyRefId;

  logger.log(`🔑 Using from account: ${fromAccountId}`);
  logger.log(`🔑 Will sign with from account key`);

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

  logger.log(
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

    // 2. Sign and execute transaction using the from account key
    logger.debug(`Using key ${signerKeyRefId} for signing transaction`);
    const result = await api.txExecution.signAndExecuteWith(
      transferTransaction,
      {
        keyRefId: signerKeyRefId,
      },
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

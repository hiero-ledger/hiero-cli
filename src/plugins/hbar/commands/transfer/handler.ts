/**
 * HBAR Transfer Command Handler
 * Handles HBAR transfers using the Core API
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { formatError } from '../../../../core/utils/errors';
import {
  AccountIdKeyPairSchema,
  EntityIdSchema,
} from '../../../../core/schemas';
import { HBAR_DECIMALS, Status } from '../../../../core/shared/constants';
import { TransferInputSchema } from '../../schema';
import { TransferOutput } from './output';
import { CoreApi } from '../../../../core';
import { Logger } from '../../../../core';
import { SupportedNetwork } from '../../../../core/types/shared.types';
import { processBalanceInput } from '../../../../core/utils/process-balance-input';
import { parseIdKeyPair } from '../../../../core/utils/keys';
import type { KeyAlgorithm as KeyAlgorithmType } from '../../../../core/services/kms/kms-types.interface';
import { KeyAlgorithm } from '../../../../core/shared/constants';

/**
 * Maps validation error paths to user-friendly error messages
 */
function getValidationErrorMessage(
  errorPath: string | number | undefined,
): string {
  const pathMap: Record<string, string> = {
    balance: 'Invalid balance value',
    to: 'Invalid or missing "to" field',
  };
  return pathMap[String(errorPath)] || 'Invalid input';
}

/**
 * Attempts to resolve a default "from" account when not provided
 * Falls back to the configured network operator
 */
function getDefaultFromAccount(
  api: CoreApi,
  logger: Logger,
):
  | { success: true; accountId: string; keyRefId: string }
  | { success: false; error: CommandExecutionResult } {
  const currentNetwork = api.network.getCurrentNetwork();
  const operator = api.network.getOperator(currentNetwork);

  if (operator) {
    const { accountId, keyRefId } = operator;

    logger.log(`[HBAR] Using default operator as from: ${accountId}`);
    return { success: true, accountId, keyRefId };
  }

  return {
    success: false,
    error: {
      status: Status.Failure,
      errorMessage:
        `No --from provided and no default operator configured for network ${currentNetwork}. ` +
        'Provide --from <accountId|name|alias> for the current network.',
    },
  };
}

/**
 * Resolves the "from" account ID and key reference
 * Handles both account-id:private-key pairs and alias lookups
 */
function resolveFromAccount(
  from: string | undefined,
  api: CoreApi,
  logger: Logger,
  currentNetwork: SupportedNetwork,
):
  | { success: true; fromAccountId: string; fromKeyRefId: string }
  | { success: false; error: CommandExecutionResult } {
  if (!from) {
    const result = getDefaultFromAccount(api, logger);
    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    } else {
      return {
        success: true,
        fromAccountId: result.accountId,
        fromKeyRefId: result.keyRefId,
      };
    }
  }

  if (AccountIdKeyPairSchema.safeParse(from).success) {
    try {
      const { accountId, privateKey, keyType } = parseIdKeyPair(from);

      // Default to ecdsa if keyType is not provided
      const keyTypeToUse: KeyAlgorithmType = keyType || KeyAlgorithm.ECDSA;

      const imported = api.kms.importPrivateKey(keyTypeToUse, privateKey);

      logger.log(
        `[HBAR] Using from as account ID with private key: ${accountId} (keyType: ${keyTypeToUse})`,
      );
      return {
        success: true,
        fromAccountId: accountId,
        fromKeyRefId: imported.keyRefId,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          status: Status.Failure,
          errorMessage: `Invalid from account format: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      };
    }
  }

  const fromAlias = api.alias.resolve(from, 'account', currentNetwork);
  const fromAccountId = fromAlias?.entityId;
  const fromKeyRefId = fromAlias?.keyRefId;

  if (!fromAccountId || !fromKeyRefId) {
    return {
      success: false,
      error: {
        status: Status.Failure,
        errorMessage: `Invalid from account: ${from} is neither a valid account-id:private-key pair, nor a known account name`,
      },
    };
  }

  logger.log(`[HBAR] Resolved from alias: ${from} -> ${fromAccountId}`);
  return {
    success: true,
    fromAccountId,
    fromKeyRefId,
  };
}

export async function transferHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  logger.log('[HBAR] Transfer command invoked');

  try {
    const validationResult = TransferInputSchema.safeParse(args.args);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      const errorMessage = getValidationErrorMessage(firstError.path[0]);
      return {
        status: Status.Failure,
        errorMessage,
      };
    }

    const validatedInput = validationResult.data;
    const to = validatedInput.to;
    const fromInput = validatedInput.from;
    const memo = validatedInput.memo;

    let amount: bigint;

    try {
      // Convert balance input: display units (default) or base units (with 't' suffix)
      amount = processBalanceInput(validatedInput.balance, HBAR_DECIMALS);
    } catch {
      return {
        status: Status.Failure,
        errorMessage: 'Invalid balance input',
      };
    }

    if (amount <= 0n) {
      return {
        status: Status.Failure,
        // @TODO Include that validation in future zod schema for inputs
        errorMessage: 'Transfer amount must be greater than zero',
      };
    }

    if (fromInput && fromInput === to) {
      return {
        status: Status.Failure,
        errorMessage: 'Cannot transfer to the same account',
      };
    }

    const currentNetwork = api.network.getCurrentNetwork();

    const fromResult = resolveFromAccount(
      fromInput,
      api,
      logger,
      currentNetwork,
    );
    if (!fromResult.success) {
      return fromResult.error;
    }
    const { fromAccountId, fromKeyRefId } = fromResult;
    let toAccountId = to;

    if (EntityIdSchema.safeParse(to).success) {
      toAccountId = to;
      logger.log(`[HBAR] Using to as account ID: ${to}`);
    } else {
      const toAlias = api.alias.resolve(to, 'account', currentNetwork);
      if (toAlias) {
        toAccountId = toAlias.entityId || to;
        logger.log(`[HBAR] Resolved to alias: ${to} -> ${toAccountId}`);
      } else {
        return {
          status: Status.Failure,
          errorMessage: `Invalid to account: ${to} is neither a valid account ID nor a known alias`,
        };
      }
    }

    logger.log(
      `[HBAR] Transferring ${amount.toString()} tinybars from ${fromAccountId} to ${toAccountId}`,
    );

    const transferResult = await api.hbar.transferTinybar({
      amount: amount,
      from: fromAccountId,
      to: toAccountId,
      memo,
    });

    const result = fromKeyRefId
      ? await api.txExecution.signAndExecuteWith(transferResult.transaction, {
          keyRefId: fromKeyRefId,
        })
      : await api.txExecution.signAndExecute(transferResult.transaction);

    if (!result.success) {
      return {
        status: Status.Failure,
        errorMessage: `Transfer failed: ${result.receipt?.status?.status ?? 'UNKNOWN'}`,
      };
    }

    logger.log(
      `[HBAR] Transfer submitted successfully, txId=${result.transactionId}`,
    );

    const outputData: TransferOutput = {
      transactionId: result.transactionId || '',
      fromAccountId,
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

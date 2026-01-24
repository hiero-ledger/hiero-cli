/**
 * Batch Token Transfer Command Handler
 * Processes multiple token transfers from a CSV file
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { BatchTokenTransferOutput } from './output';

import { randomUUID } from 'crypto';

import { EntityIdSchema } from '@/core/schemas';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { processBalanceInput } from '@/core/utils/process-balance-input';
import { parseTokenTransferCSV } from '@/plugins/batch/utils/csv-parser';

import { BatchTokenTransferInputSchema } from './input';

export async function batchTokenTransferHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  logger.info('[BATCH] Batch token transfer command invoked');

  const validArgs = BatchTokenTransferInputSchema.parse(args.args);

  const { file, token: tokenIdOrAlias, dryRun, continueOnError } = validArgs;
  const fromArg = validArgs.from;

  const providedKeyManager = validArgs.keyManager;
  const keyManager =
    providedKeyManager ||
    api.config.getOption<KeyManagerName>('default_key_manager');

  try {
    // Parse and validate CSV
    logger.info(`[BATCH] Parsing CSV file: ${file}`);
    const { rows, errors: parseErrors } = parseTokenTransferCSV(file);

    if (parseErrors.length > 0) {
      const errorMessages = parseErrors
        .map((e) => `Line ${e.line}: ${e.error}`)
        .join('\n');
      return {
        status: Status.Failure,
        errorMessage: `CSV validation failed:\n${errorMessages}`,
      };
    }

    if (rows.length === 0) {
      return {
        status: Status.Failure,
        errorMessage: 'CSV file contains no valid transfer rows',
      };
    }

    logger.info(`[BATCH] Found ${rows.length} transfers to process`);

    const currentNetwork = api.network.getCurrentNetwork();

    // Resolve token ID
    let tokenId = tokenIdOrAlias;
    const tokenAlias = api.alias.resolve(
      tokenIdOrAlias,
      'token',
      currentNetwork,
    );
    if (tokenAlias && tokenAlias.entityId) {
      tokenId = tokenAlias.entityId;
    } else if (!EntityIdSchema.safeParse(tokenIdOrAlias).success) {
      return {
        status: Status.Failure,
        errorMessage: `Invalid token: ${tokenIdOrAlias} is neither a valid token ID nor a known alias`,
      };
    }

    // Get token decimals for amount processing
    let tokenDecimals = 0;
    try {
      const tokenInfo = await api.mirror.getTokenInfo(tokenId);
      tokenDecimals = parseInt(tokenInfo.decimals) || 0;
    } catch (error) {
      return {
        status: Status.Failure,
        errorMessage: formatError(
          `Failed to fetch token info for ${tokenId}`,
          error,
        ),
      };
    }

    // Resolve source account
    const from = await api.keyResolver.getOrInitKeyWithFallback(
      fromArg,
      keyManager,
      ['batch:token-transfer'],
    );

    const batchId = randomUUID();
    const startedAt = new Date().toISOString();

    const results: BatchTokenTransferOutput['results'] = [];
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let totalAmount = 0n;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const index = i;

      logger.info(
        `[BATCH] Processing transfer ${i + 1}/${rows.length}: ${row.to}`,
      );

      // Validate destination account
      let toAccountId = row.to;
      const toAlias = api.alias.resolve(row.to, 'account', currentNetwork);

      if (toAlias && toAlias.entityId) {
        toAccountId = toAlias.entityId;
      } else if (!EntityIdSchema.safeParse(row.to).success) {
        const result = {
          index,
          to: row.to,
          amount: row.amount,
          status: 'failed' as const,
          error: `Invalid account ID: ${row.to}`,
        };
        results.push(result);
        failedCount++;

        if (!continueOnError) {
          break;
        }
        continue;
      }

      // Skip self-transfers
      if (from.accountId === toAccountId) {
        const result = {
          index,
          to: toAccountId,
          amount: row.amount,
          status: 'skipped' as const,
          error: 'Cannot transfer to same account',
        };
        results.push(result);
        skippedCount++;
        continue;
      }

      // Parse amount
      let amount: bigint;
      try {
        amount = processBalanceInput(row.amount, tokenDecimals);
      } catch {
        const result = {
          index,
          to: toAccountId,
          amount: row.amount,
          status: 'failed' as const,
          error: 'Invalid amount format',
        };
        results.push(result);
        failedCount++;

        if (!continueOnError) {
          break;
        }
        continue;
      }

      // Dry run - just validate
      if (dryRun) {
        const result = {
          index,
          to: toAccountId,
          amount: row.amount,
          status: 'success' as const,
        };
        results.push(result);
        successCount++;
        totalAmount += amount;
        continue;
      }

      // Execute transfer
      try {
        const transferTransaction = api.token.createTransferTransaction({
          tokenId,
          fromAccountId: from.accountId,
          toAccountId,
          amount,
        });

        const txResult = await api.txExecution.signAndExecuteWith(
          transferTransaction,
          [from.keyRefId],
        );

        if (txResult.success) {
          const result = {
            index,
            to: toAccountId,
            amount: row.amount,
            status: 'success' as const,
            transactionId: txResult.transactionId,
          };
          results.push(result);
          successCount++;
          totalAmount += amount;
          logger.info(
            `[BATCH] Transfer ${i + 1} successful: ${txResult.transactionId}`,
          );
        } else {
          const result = {
            index,
            to: toAccountId,
            amount: row.amount,
            status: 'failed' as const,
            error: `Transaction failed: ${txResult.receipt?.status?.status ?? 'UNKNOWN'}`,
          };
          results.push(result);
          failedCount++;

          if (!continueOnError) {
            break;
          }
        }
      } catch (error) {
        const result = {
          index,
          to: toAccountId,
          amount: row.amount,
          status: 'failed' as const,
          error: formatError('Transfer error', error),
        };
        results.push(result);
        failedCount++;

        if (!continueOnError) {
          break;
        }
      }
    }

    const completedAt = new Date().toISOString();

    const outputData: BatchTokenTransferOutput = {
      batchId,
      network: currentNetwork,
      tokenId,
      sourceFile: file,
      dryRun: dryRun ?? false,
      totalTransfers: rows.length,
      successCount,
      failedCount,
      skippedCount,
      totalAmount: totalAmount.toString(),
      results,
      startedAt,
      completedAt,
    };

    return {
      status: failedCount > 0 && !dryRun ? Status.Failure : Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Batch token transfer failed', error),
    };
  }
}

/**
 * Batch Transfer FT Command Handler
 *
 * Reads a CSV file with columns: to, amount
 * Executes fungible token transfers sequentially and reports results.
 *
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { BatchTransferFtOutput } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { processBalanceInput } from '@/core/utils/process-balance-input';
import {
  type BatchRowResult,
  executeBatch,
} from '@/plugins/batch/utils/batch-executor';
import { parseCsvFile } from '@/plugins/batch/utils/csv-parser';
import {
  resolveDestinationAccountParameter,
  resolveTokenParameter,
} from '@/plugins/token/resolver-helper';
import { isRawUnits } from '@/plugins/token/utils/token-amount-helpers';

import { BatchTransferFtInputSchema } from './input';

interface FtTransferRow {
  to: string;
  amount: string;
}

const REQUIRED_HEADERS = ['to', 'amount'];

export async function batchTransferFt(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const validArgs = BatchTransferFtInputSchema.parse(args.args);

  const keyManagerArg = validArgs.keyManager;
  const keyManager =
    keyManagerArg ||
    api.config.getOption<KeyManagerName>('default_key_manager');

  const network = api.network.getCurrentNetwork();

  // Resolve token
  const resolvedToken = resolveTokenParameter(validArgs.token, api, network);

  if (!resolvedToken) {
    return {
      status: Status.Failure,
      errorMessage: `Failed to resolve token: ${validArgs.token}. Expected format: token-name OR token-id`,
    };
  }

  const tokenId = resolvedToken.tokenId;

  // Look up token decimals for display-unit conversion
  let tokenDecimals = 0;
  try {
    const tokenInfo = await api.mirror.getTokenInfo(tokenId);
    tokenDecimals = parseInt(tokenInfo.decimals) || 0;
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError(
        `Failed to fetch token decimals for ${tokenId}`,
        error,
      ),
    };
  }

  // Parse CSV
  let rows: FtTransferRow[];
  try {
    const csv = parseCsvFile<FtTransferRow>(validArgs.file, REQUIRED_HEADERS);
    rows = csv.rows;
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to parse CSV file', error),
    };
  }

  logger.info(
    `Parsed ${rows.length} transfer(s) from CSV for token ${tokenId}`,
  );

  // Resolve source account
  const from = await api.keyResolver.getOrInitKeyWithFallback(
    validArgs.from,
    keyManager,
    ['token:account'],
  );

  const fromAccountId = from.accountId;

  // Validate all rows
  const validationErrors: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.to || row.to.trim().length === 0) {
      validationErrors.push(`Row ${i + 1}: missing "to" field`);
    }
    if (!row.amount || row.amount.trim().length === 0) {
      validationErrors.push(`Row ${i + 1}: missing "amount" field`);
    } else {
      try {
        const decimals = isRawUnits(row.amount) ? 0 : tokenDecimals;
        processBalanceInput(row.amount, decimals);
      } catch {
        validationErrors.push(`Row ${i + 1}: invalid amount "${row.amount}"`);
      }
    }
  }

  if (validationErrors.length > 0) {
    return {
      status: Status.Failure,
      errorMessage:
        `CSV validation failed:\n` +
        validationErrors.map((e) => `  - ${e}`).join('\n'),
    };
  }

  // Dry run
  if (validArgs.dryRun) {
    const dryRunResults = rows.map((row, i) => ({
      row: i + 1,
      status: 'success' as const,
      to: row.to,
      amount: row.amount,
    }));

    const output: BatchTransferFtOutput = {
      total: rows.length,
      succeeded: rows.length,
      failed: 0,
      tokenId,
      fromAccount: fromAccountId,
      network,
      dryRun: true,
      results: dryRunResults,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  }

  // Execute transfers
  const summary = await executeBatch(
    rows,
    async (row: FtTransferRow): Promise<Omit<BatchRowResult, 'row'>> => {
      // Resolve destination
      const resolvedTo = resolveDestinationAccountParameter(
        row.to,
        api,
        network,
      );

      if (!resolvedTo) {
        return {
          status: 'failed',
          errorMessage: `Invalid destination: "${row.to}" is neither a valid account ID nor a known alias`,
          details: { to: row.to, amount: row.amount },
        };
      }

      const toAccountId = resolvedTo.accountId;
      const decimals = isRawUnits(row.amount) ? 0 : tokenDecimals;
      const rawAmount = processBalanceInput(row.amount, decimals);

      const transferTransaction = api.token.createTransferTransaction({
        tokenId,
        fromAccountId,
        toAccountId,
        amount: rawAmount,
      });

      const result = await api.txExecution.signAndExecuteWith(
        transferTransaction,
        [from.keyRefId],
      );

      if (!result.success) {
        return {
          status: 'failed',
          errorMessage: 'Token transfer failed',
          details: { to: row.to, amount: row.amount },
        };
      }

      return {
        status: 'success',
        transactionId: result.transactionId,
        details: { to: toAccountId, amount: row.amount },
      };
    },
    logger,
  );

  const outputResults = summary.results.map((r) => ({
    row: r.row,
    status: r.status,
    to: r.details.to as string | undefined,
    amount: r.details.amount as string | undefined,
    transactionId: r.transactionId,
    errorMessage: r.errorMessage,
  }));

  const output: BatchTransferFtOutput = {
    total: summary.total,
    succeeded: summary.succeeded,
    failed: summary.failed,
    tokenId,
    fromAccount: fromAccountId,
    network,
    dryRun: false,
    results: outputResults,
  };

  return {
    status: summary.failed === summary.total ? Status.Failure : Status.Success,
    outputJson: JSON.stringify(output),
    ...(summary.failed > 0 && summary.failed < summary.total
      ? {
          errorMessage: `${summary.failed} of ${summary.total} transfers failed. See results for details.`,
        }
      : {}),
  };
}

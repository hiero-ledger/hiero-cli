/**
 * Batch Transfer HBAR Command Handler
 *
 * Reads a CSV file with columns: to, amount
 * Executes HBAR transfers sequentially and reports results.
 *
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { BatchTransferHbarOutput } from './output';

import { EntityIdSchema } from '@/core/schemas';
import { HBAR_DECIMALS, Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { processBalanceInput } from '@/core/utils/process-balance-input';
import {
  type BatchRowResult,
  executeBatch,
} from '@/plugins/batch/utils/batch-executor';
import { parseCsvFile } from '@/plugins/batch/utils/csv-parser';

import { BatchTransferHbarInputSchema } from './input';

interface HbarTransferRow {
  to: string;
  amount: string;
  memo?: string;
}

const REQUIRED_HEADERS = ['to', 'amount'];

export async function batchTransferHbar(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const validArgs = BatchTransferHbarInputSchema.parse(args.args);

  const keyManagerArg = validArgs.keyManager;
  const keyManager =
    keyManagerArg ||
    api.config.getOption<KeyManagerName>('default_key_manager');

  const network = api.network.getCurrentNetwork();

  // Parse CSV
  let rows: HbarTransferRow[];
  try {
    const csv = parseCsvFile<HbarTransferRow>(validArgs.file, REQUIRED_HEADERS);
    rows = csv.rows;
  } catch (error) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to parse CSV file', error),
    };
  }

  logger.info(`Parsed ${rows.length} transfer(s) from CSV`);

  // Resolve source account
  const from = await api.keyResolver.getOrInitKeyWithFallback(
    validArgs.from,
    keyManager,
    ['hbar:transfer'],
  );

  const fromAccountId = from.accountId;

  // Validate all rows before executing
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
        processBalanceInput(row.amount, HBAR_DECIMALS);
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

  // Dry run: validate only, no transactions
  if (validArgs.dryRun) {
    const dryRunResults = rows.map((row, i) => ({
      row: i + 1,
      status: 'success' as const,
      to: row.to,
      amount: row.amount,
    }));

    const output: BatchTransferHbarOutput = {
      total: rows.length,
      succeeded: rows.length,
      failed: 0,
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
    async (row: HbarTransferRow): Promise<Omit<BatchRowResult, 'row'>> => {
      // Resolve destination
      let toAccountId = row.to;
      const toAlias = api.alias.resolve(row.to, 'account', network);

      if (toAlias && toAlias.entityId) {
        toAccountId = toAlias.entityId;
      } else if (!EntityIdSchema.safeParse(row.to).success) {
        return {
          status: 'failed',
          errorMessage: `Invalid destination: "${row.to}" is neither a valid account ID nor a known alias`,
          details: { to: row.to, amount: row.amount },
        };
      }

      if (fromAccountId === toAccountId) {
        return {
          status: 'failed',
          errorMessage: 'Cannot transfer to the same account',
          details: { to: row.to, amount: row.amount },
        };
      }

      const amount = processBalanceInput(row.amount, HBAR_DECIMALS);
      const memo = row.memo || validArgs.memo;

      const transferResult = await api.hbar.transferTinybar({
        amount,
        from: fromAccountId,
        to: toAccountId,
        memo,
      });

      const result = await api.txExecution.signAndExecuteWith(
        transferResult.transaction,
        [from.keyRefId],
      );

      if (!result.success) {
        return {
          status: 'failed',
          errorMessage: `Transfer failed: ${result.receipt?.status?.status ?? 'UNKNOWN'}`,
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

  const output: BatchTransferHbarOutput = {
    total: summary.total,
    succeeded: summary.succeeded,
    failed: summary.failed,
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

/**
 * Split Payments Transfer Command Handler
 * Reads a CSV of (to, amount) and executes multiple HBAR transfers in one command.
 */
/// <reference types="node" />
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { SplitPaymentsTransferOutput, TransferItemResult } from './output';

import * as fs from 'fs';
import * as path from 'path';

import { EntityIdSchema } from '@/core/schemas';
import { HBAR_DECIMALS, Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { processBalanceInput } from '@/core/utils/process-balance-input';

import { SplitPaymentsTransferInputSchema } from './input';

/** Parse a single line of CSV (handles quoted values) */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      current += c;
    } else if (c === ',' || c === ';') {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

/** Check if first line looks like a header */
function isHeader(row: string[]): boolean {
  if (row.length < 2) return false;
  const first = row[0].toLowerCase();
  const second = row[1].toLowerCase();
  return (
    (first === 'to' || first === 'address' || first === 'account') &&
    (second === 'amount' || second === 'amount_hbar' || second === 'value')
  );
}

/**
 * Parse CSV file into { to, amount } rows.
 * Expected columns: to (address or alias), amount (HBAR or e.g. 100t for tinybars).
 */
function parseCsvFile(filePath: string): Array<{ to: string; amount: string }> {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }
  const content = fs.readFileSync(resolved, 'utf-8');
  const lines = content
    .split(/\r?\n/)
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0);

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  const rows = lines.map(parseCsvLine);
  const startIndex = rows.length > 0 && isHeader(rows[0]) ? 1 : 0;
  const result: Array<{ to: string; amount: string }> = [];

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) {
      throw new Error(
        `Row ${i + 1}: expected "to,amount" (got ${row.length} columns)`,
      );
    }
    const to = row[0].replace(/^["']|["']$/g, '').trim();
    const amount = row[1].replace(/^["']|["']$/g, '').trim();
    if (!to || !amount) {
      throw new Error(`Row ${i + 1}: empty to or amount`);
    }
    result.push({ to, amount });
  }

  return result;
}

export async function splitPaymentsTransferHandler(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const validArgs = SplitPaymentsTransferInputSchema.parse(args.args);
  const keyManager: KeyManagerName =
    validArgs.keyManager ??
    api.config.getOption<KeyManagerName>('default_key_manager');

  let rows: Array<{ to: string; amount: string }>;
  try {
    rows = parseCsvFile(validArgs.file);
  } catch (err) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Invalid CSV file', err),
    };
  }

  if (rows.length === 0) {
    return {
      status: Status.Failure,
      errorMessage: 'CSV file has no data rows (only header or empty).',
    };
  }

  const from = await api.keyResolver.getOrInitKeyWithFallback(
    validArgs.from,
    keyManager,
    ['split-payments:transfer'],
  );

  const currentNetwork = api.network.getCurrentNetwork();
  const transfers: TransferItemResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  const resolveToAccountId = (to: string): string => {
    const alias = api.alias.resolve(to, 'account', currentNetwork);
    if (alias?.entityId) return alias.entityId;
    const parsed = EntityIdSchema.safeParse(to);
    if (parsed.success) return parsed.data;
    throw new Error(`Invalid account: ${to} is not a valid ID or alias`);
  };

  if (validArgs.dryRun) {
    for (const { to, amount } of rows) {
      try {
        const amountTinybar = processBalanceInput(amount, HBAR_DECIMALS);
        if (amountTinybar <= 0n) throw new Error('Amount must be positive');
        const toAccountId = resolveToAccountId(to);
        if (from.accountId === toAccountId)
          throw new Error('Cannot transfer to self');
        transfers.push({
          toAccountId,
          amountTinybar,
          status: 'success',
        });
        successCount++;
      } catch (e) {
        transfers.push({
          toAccountId: to as string,
          amountTinybar: 0n,
          status: 'failure',
          errorMessage: e instanceof Error ? e.message : String(e),
        });
        failureCount++;
      }
    }
    const outputData: SplitPaymentsTransferOutput = {
      network: currentNetwork,
      fromAccountId: from.accountId,
      totalTransfers: rows.length,
      successCount,
      failureCount,
      dryRun: true,
      transfers,
    };
    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  }

  for (const { to, amount } of rows) {
    let toAccountId: string;
    let amountTinybar: bigint;
    try {
      amountTinybar = processBalanceInput(amount, HBAR_DECIMALS);
      if (amountTinybar <= 0n) throw new Error('Amount must be positive');
      toAccountId = resolveToAccountId(to);
      if (from.accountId === toAccountId) {
        transfers.push({
          toAccountId,
          amountTinybar,
          status: 'failure',
          errorMessage: 'Cannot transfer to the same account',
        });
        failureCount++;
        continue;
      }
    } catch (e) {
      transfers.push({
        toAccountId: to as string,
        amountTinybar: 0n,
        status: 'failure',
        errorMessage: e instanceof Error ? e.message : String(e),
      });
      failureCount++;
      continue;
    }

    try {
      const transferResult = await api.hbar.transferTinybar({
        amount: amountTinybar,
        from: from.accountId,
        to: toAccountId,
      });
      const result = await api.txExecution.signAndExecuteWith(
        transferResult.transaction,
        [from.keyRefId],
      );

      if (result.success && result.transactionId) {
        transfers.push({
          toAccountId,
          amountTinybar,
          transactionId: result.transactionId,
          status: 'success',
        });
        successCount++;
        logger.info(
          `[split-payments] Transferred to ${toAccountId}: ${amountTinybar} tinybars (${result.transactionId})`,
        );
      } else {
        transfers.push({
          toAccountId,
          amountTinybar,
          status: 'failure',
          errorMessage: result.receipt?.status?.status?.toString() ?? 'UNKNOWN',
        });
        failureCount++;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      transfers.push({
        toAccountId,
        amountTinybar,
        status: 'failure',
        errorMessage: msg,
      });
      failureCount++;
      logger.warn(
        `[split-payments] Failed to transfer to ${toAccountId}: ${msg}`,
      );
    }
  }

  const outputData: SplitPaymentsTransferOutput = {
    network: currentNetwork,
    fromAccountId: from.accountId,
    totalTransfers: rows.length,
    successCount,
    failureCount,
    transfers,
  };

  return {
    status: Status.Success,
    outputJson: JSON.stringify(outputData),
  };
}

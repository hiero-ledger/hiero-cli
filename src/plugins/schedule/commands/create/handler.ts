/**
 * schedule:create command handler
 *
 * Builds a ScheduleCreateTransaction that wraps an HBAR transfer and submits
 * it to the Hedera network via the CoreAPI tx-execution service.
 *
 * The inner TransferTransaction is never executed directly — it is the
 * *scheduled* operation.  The ScheduleCreateTransaction itself is what goes
 * on-chain and what the operator pays for.
 */
import type {
  CommandExecutionResult,
  CommandHandlerArgs,
} from '@/core';

import {
  Hbar,
  ScheduleCreateTransaction,
  Timestamp,
  TransferTransaction,
} from '@hashgraph/sdk';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

import { CreateInputSchema } from './input';
import type { CreateScheduleOutput } from './output';

/**
 * Handler for `schedule:create`.
 *
 * Input validation (ZodError) is intentionally performed BEFORE the try-catch
 * so that schema errors propagate to the CLI core unchanged — per ADR-003.
 */
export async function createSchedule(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // ── 1. Validate inputs (must be outside try-catch — ADR-003) ──────────────
  const validArgs = CreateInputSchema.parse(args.args);

  const expirySeconds = validArgs['expiry-seconds'];
  const network = api.network.getCurrentNetwork();
  const operator = api.network.getCurrentOperatorOrThrow();

  try {
    // ── 2. Build the inner transfer (the "scheduled" operation) ──────────────
    const innerTransfer = new TransferTransaction()
      .addHbarTransfer(validArgs.to, Hbar.fromTinybars(validArgs.amount))
      .addHbarTransfer(operator.accountId, Hbar.fromTinybars(`-${validArgs.amount}`));

    // ── 3. Build the schedule wrapper ────────────────────────────────────────
    const expiresAt = new Timestamp(
      Math.floor(Date.now() / 1000) + expirySeconds,
      0,
    );

    const scheduleTx = new ScheduleCreateTransaction()
      .setScheduledTransaction(innerTransfer)
      .setExpirationTime(expiresAt)
      // Wait for the full expiry window; do not execute early once all
      // required signatures are collected.
      .setWaitForExpiry(true);

    if (validArgs.memo) {
      scheduleTx.setScheduleMemo(validArgs.memo);
    }

    logger.info(`Creating scheduled HBAR transfer → ${validArgs.to} (${validArgs.amount} tinybars)`);

    // ── 4. Sign and submit via CoreAPI ────────────────────────────────────────
    const result = await api.txExecution.signAndExecute(scheduleTx);

    if (!result.success) {
      return {
        status: Status.Failure,
        errorMessage: 'Transaction was submitted but the network returned a non-success status.',
      };
    }

    // result.scheduleId is populated by the tx-execution service from
    // receipt.scheduleId (added as part of this PR).
    const scheduleId = result.scheduleId;

    if (!scheduleId) {
      return {
        status: Status.Failure,
        errorMessage:
          'Transaction succeeded but schedule ID was not returned in the receipt. ' +
          'Ensure you are running a version of hiero-cli that includes the scheduleId ' +
          'patch to TxExecutionServiceImpl.',
      };
    }

    // ── 5. Return structured output ───────────────────────────────────────────
    const output: CreateScheduleOutput = {
      scheduleId,
      transactionId: result.transactionId,
      payer: operator.accountId,
      expirySeconds,
      network,
      memo: validArgs.memo,
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(output),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to create scheduled transaction', error),
    };
  }
}

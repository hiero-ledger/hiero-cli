/**
 * schedule:watch command handler
 *
 * Polls the Hedera mirror node at a configurable interval until the schedule
 * reaches a terminal state (EXECUTED or DELETED), or the timeout elapses.
 *
 * Progress is streamed via logger.info so the user can see each poll attempt
 * in real time.
 */
import type {
  CommandExecutionResult,
  CommandHandlerArgs,
} from '@/core';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';

import { WatchInputSchema } from './input';
import type { WatchOutput } from './output';

interface MirrorScheduleResponse {
  executed_timestamp: string | null;
  deleted: boolean;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function watchSchedule(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  // ── 1. Validate inputs (outside try-catch — ADR-003) ──────────────────────
  const validArgs = WatchInputSchema.parse(args.args);
  const scheduleId = validArgs['schedule-id'];
  const pollMs = validArgs['poll-interval'] * 1000;
  const timeoutMs = validArgs.timeout * 1000;

  const network = api.network.getCurrentNetwork();
  const networkConfig = api.network.getNetworkConfig(network);
  const mirrorBase = networkConfig.mirrorNodeUrl.replace(/\/$/, '');
  const url = `${mirrorBase}/api/v1/schedules/${scheduleId}`;

  const startTime = Date.now();

  logger.info(
    `Watching schedule ${scheduleId} on ${network} (poll every ${validArgs['poll-interval']}s, timeout ${validArgs.timeout}s) …`,
  );

  try {
    while (true) {
      const elapsed = Date.now() - startTime;

      if (elapsed >= timeoutMs) {
        const output: WatchOutput = {
          scheduleId,
          finalState: 'TIMEOUT',
          resolvedAt: new Date().toISOString(),
          elapsedSeconds: Math.round(elapsed / 1000),
          network,
        };
        logger.info(`Watch timed-out after ${output.elapsedSeconds}s.`);
        return {
          status: Status.Success,
          outputJson: JSON.stringify(output),
        };
      }

      const response = await fetch(url);

      if (response.status === 404) {
        logger.info(`… schedule not yet visible on mirror node, retrying …`);
        await sleep(pollMs);
        continue;
      }

      if (!response.ok) {
        return {
          status: Status.Failure,
          errorMessage: `Mirror node returned HTTP ${response.status} for ${url}`,
        };
      }

      const data: MirrorScheduleResponse = await response.json() as MirrorScheduleResponse;

      const executed =
        data.executed_timestamp !== null && data.executed_timestamp !== undefined;
      const deleted = Boolean(data.deleted);

      if (executed) {
        const elapsed2 = Date.now() - startTime;
        const output: WatchOutput = {
          scheduleId,
          finalState: 'EXECUTED',
          resolvedAt: new Date().toISOString(),
          elapsedSeconds: Math.round(elapsed2 / 1000),
          network,
        };
        logger.info(`Schedule ${scheduleId} has been EXECUTED.`);
        return {
          status: Status.Success,
          outputJson: JSON.stringify(output),
        };
      }

      if (deleted) {
        const elapsed2 = Date.now() - startTime;
        const output: WatchOutput = {
          scheduleId,
          finalState: 'DELETED',
          resolvedAt: new Date().toISOString(),
          elapsedSeconds: Math.round(elapsed2 / 1000),
          network,
        };
        logger.info(`Schedule ${scheduleId} has been DELETED.`);
        return {
          status: Status.Success,
          outputJson: JSON.stringify(output),
        };
      }

      logger.info(
        `… ${scheduleId} still PENDING (${Math.round((Date.now() - startTime) / 1000)}s elapsed), next poll in ${validArgs['poll-interval']}s …`,
      );
      await sleep(pollMs);
    }
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError(`Error while watching schedule ${scheduleId}`, error),
    };
  }
}

import type { BaseBuildTransactionResult } from '@/core';
import type { Hook, HookResult } from '@/core/hooks/hook.interface';
import type { PreSignTransactionHookParams } from '@/core/hooks/types';
import type { ScheduledNormalizedParams } from '@/plugins/schedule/hooks/scheduled/types';

import { StateError, TransactionError } from '@/core';
import { NotFoundError, ValidationError } from '@/core/errors';
import { composeKey } from '@/core/utils/key-composer';
import { ScheduledInputSchema } from '@/plugins/schedule/hooks/scheduled/input';
import {
  SCHEDULED_TEMPLATE,
  ScheduledOutputSchema,
} from '@/plugins/schedule/hooks/scheduled/output';
import { ZustandScheduleStateHelper } from '@/plugins/schedule/zustand-state-helper';

export class ScheduledHook implements Hook<
  PreSignTransactionHookParams<
    ScheduledNormalizedParams,
    BaseBuildTransactionResult
  >
> {
  async execute(
    params: PreSignTransactionHookParams<
      ScheduledNormalizedParams,
      BaseBuildTransactionResult
    >,
  ): Promise<HookResult> {
    const { args, commandName, buildTransactionResult } = params;
    const { api, logger } = args;
    const scheduledState = new ZustandScheduleStateHelper(api.state, logger);
    const validArgs = ScheduledInputSchema.parse(args.args);
    const scheduledName = validArgs.scheduled;
    const network = api.network.getCurrentNetwork();
    if (!scheduledName) {
      logger.debug(
        'No parameter "scheduled" found. Transaction will not be scheduled.',
      );
      return { breakFlow: false };
    }
    const key = composeKey(network, scheduledName);
    const scheduledRecord = scheduledState.getScheduled(key);
    if (!scheduledRecord) {
      throw new NotFoundError(`Scheduled not found for name ${scheduledName}`);
    }
    if (scheduledRecord.scheduled) {
      throw new ValidationError('Transaction is already scheduled');
    }

    const scheduleTx = api.schedule.buildScheduleCreateTransaction({
      innerTransaction: buildTransactionResult.transaction,
      payerAccountId: scheduledRecord.payerAccountId,
      adminKey: scheduledRecord.adminPublicKey,
      scheduleMemo: scheduledRecord.memo,
      expirationTime: scheduledRecord.expirationTime
        ? new Date(scheduledRecord.expirationTime)
        : undefined,
      waitForExpiry: scheduledRecord.waitForExpiry,
    });
    const keyRefIds = [];
    if (scheduledRecord.adminKeyRefId) {
      keyRefIds.push(scheduledRecord.adminKeyRefId);
    }
    if (scheduledRecord.payerKeyRefId) {
      keyRefIds.push(scheduledRecord.payerKeyRefId);
    }
    const signedTx = await api.txSign.sign(scheduleTx, keyRefIds);
    const result = await api.txExecute.execute(signedTx);

    if (!result.success) {
      throw new TransactionError(
        `Failed to create scheduled transaction (txId: ${result.transactionId})`,
        false,
      );
    }

    if (!result.scheduleId) {
      throw new StateError(
        'Transaction completed but did not return an schedule ID, unable to derive addresses',
      );
    }

    scheduledState.saveScheduled(key, {
      ...scheduledRecord,
      scheduledId: result.scheduleId,
      transactionId: result.transactionId,
      normalizedParams: params.normalisedParams,
      scheduled: true,
      command: commandName,
      executed: false,
    });

    logger.info(
      `Transaction scheduled for ${scheduledName}. Transaction ID '${result.transactionId.toString()}'`,
    );

    return {
      breakFlow: true,
      result: {
        scheduledName,
        scheduledId: result.scheduleId,
        network,
        transactionId: result.transactionId.toString(),
      },
      schema: ScheduledOutputSchema,
      humanTemplate: SCHEDULED_TEMPLATE,
    };
  }
}

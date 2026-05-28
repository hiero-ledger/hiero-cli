import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { ScheduledTransactionData } from '@/core/schemas/common-schemas';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { ScheduleStateService } from '@/plugins/schedule/services/schedule-state.service.interface';
import type { ScheduleSyncService } from '@/plugins/schedule/services/schedule-sync.service.interface';
import type { ScheduleVerifyOutput } from './output';

import { EntityReferenceType, NotFoundError } from '@/core';
import {
  executePhaseHooks,
  processHookResult,
  resolveCommandHooks,
} from '@/core/hooks/hook-executor';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { OrchestratorSource } from '@/core/types/shared.types';
import { hederaTimestampToIso } from '@/core/utils/hedera-timestamp';
import { composeKey } from '@/core/utils/key-composer';
import { ScheduleKeysServiceImpl } from '@/plugins/schedule/services/schedule-keys.service';
import { ScheduleStateServiceImpl } from '@/plugins/schedule/services/schedule-state.service';
import { ScheduleSyncServiceImpl } from '@/plugins/schedule/services/schedule-sync.service';

import { ScheduleVerifyInputSchema } from './input';

export const SCHEDULE_VERIFY_COMMAND_NAME = 'schedule_verify';

export class ScheduleVerifyCommand implements Command {
  constructor(
    private readonly scheduleState: ScheduleStateService,
    private readonly scheduleSync: ScheduleSyncService,
  ) {}

  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = ScheduleVerifyInputSchema.parse(args.args);
    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);
    const network = api.network.getCurrentNetwork();
    const scheduleRef = validArgs.schedule;

    let scheduleName: string | undefined;
    let resolvedScheduleId: string | undefined;
    let scheduleRecord: ScheduledTransactionData | null = null;

    if (scheduleRef.type === EntityReferenceType.ALIAS) {
      scheduleName = scheduleRef.value;
      scheduleRecord = this.scheduleState.getScheduled(
        composeKey(network, scheduleName),
      );
      if (!scheduleRecord) {
        throw new NotFoundError(
          `No saved schedule found for name: ${scheduleName}`,
        );
      }
      resolvedScheduleId = scheduleRecord.scheduledId;
    } else {
      resolvedScheduleId = scheduleRef.value;
    }

    if (!resolvedScheduleId) {
      const outputData: ScheduleVerifyOutput = {
        network,
        name: scheduleName,
        executed: false,
        waitForExpiry: scheduleRecord?.waitForExpiry ?? false,
        scheduleMemo: scheduleRecord?.memo,
        expirationTime: scheduleRecord?.expirationTime,
        payerAccountId: scheduleRecord?.payerAccountId,
        command: scheduleRecord?.command,
      };
      return { result: outputData };
    }

    const scheduleResponse = await api.mirror.getScheduled(resolvedScheduleId);
    let updatedScheduledRecord: ScheduledTransactionData | undefined;
    if (scheduleRecord && !scheduleRecord.executed) {
      updatedScheduledRecord = {
        ...scheduleRecord,
        scheduled: true,
        executed: !!scheduleResponse.executed_timestamp,
      };
      this.scheduleState.saveScheduled(
        composeKey(network, scheduleRecord.name),
        updatedScheduledRecord,
      );
    } else if (scheduleName) {
      updatedScheduledRecord =
        await this.scheduleSync.upsertNamedScheduleFromMirror(
          scheduleName,
          resolvedScheduleId,
          network,
          keyManager,
        );
    }

    const outputData: ScheduleVerifyOutput = {
      scheduleId: resolvedScheduleId,
      network,
      name: scheduleName,
      executed: !!scheduleResponse.executed_timestamp,
      executedAt: scheduleResponse.executed_timestamp
        ? hederaTimestampToIso(scheduleResponse.executed_timestamp)
        : undefined,
      deleted: scheduleResponse.deleted,
      waitForExpiry: scheduleResponse.wait_for_expiry,
      scheduleMemo: scheduleResponse.memo,
      expirationTime: scheduleResponse.expiration_time
        ? hederaTimestampToIso(scheduleResponse.expiration_time)
        : undefined,
      payerAccountId: scheduleResponse.payer_account_id,
    };

    if (updatedScheduledRecord?.executed && updatedScheduledRecord.command) {
      const postOutputResult = await executePhaseHooks(
        resolveCommandHooks(args),
        'postOutputPreparation',
        {
          args,
          commandName: SCHEDULE_VERIFY_COMMAND_NAME,
          normalisedParams: {},
          buildTransactionResult: undefined,
          signTransactionResult: undefined,
          executeTransactionResult: {
            source: OrchestratorSource.SCHEDULE,
            scheduledData: updatedScheduledRecord,
          },
          outputResult: { result: outputData },
        },
      );
      if (postOutputResult.breakFlow) {
        return processHookResult(postOutputResult);
      }
    }

    return { result: outputData };
  }
}

export async function scheduleVerify(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;
  const scheduleState = new ScheduleStateServiceImpl(api.state, api.logger);
  const scheduleKeys = new ScheduleKeysServiceImpl(api.keyResolver, api.mirror);
  const scheduleSync = new ScheduleSyncServiceImpl(
    scheduleState,
    api.mirror,
    scheduleKeys,
  );

  return new ScheduleVerifyCommand(scheduleState, scheduleSync).execute(args);
}

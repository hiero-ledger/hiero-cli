import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { ScheduledTransactionData } from '@/plugins/schedule/schema';
import type { ScheduleVerifyOutput } from './output';

import { EntityReferenceType, KeyAlgorithm, NotFoundError } from '@/core';
import {
  executePhaseHooks,
  processHookResult,
  resolveCommandHooks,
} from '@/core/hooks/hook-executor';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { CredentialType } from '@/core/services/kms/kms-types.interface';
import { MirrorNodeKeyType } from '@/core/services/mirrornode/types';
import { OrchestratorSource } from '@/core/types/shared.types';
import { hederaTimestampToIso } from '@/core/utils/hedera-timestamp';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandScheduleStateHelper } from '@/plugins/schedule/zustand-state-helper';

import { ScheduleVerifyInputSchema } from './input';

export const SCHEDULE_VERIFY_COMMAND_NAME = 'schedule_verify';

export class ScheduleVerifyCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = ScheduleVerifyInputSchema.parse(args.args);
    const stateHelper = new ZustandScheduleStateHelper(api.state, api.logger);
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
      scheduleRecord = stateHelper.getScheduled(
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
      stateHelper.saveScheduled(
        composeKey(network, scheduleRecord.name),
        updatedScheduledRecord,
      );
    } else if (scheduleName) {
      let payer;
      if (scheduleResponse.payer_account_id) {
        payer = await api.keyResolver.getPublicKey(
          {
            type: CredentialType.ACCOUNT_ID,
            accountId: scheduleResponse.payer_account_id,
            rawValue: scheduleResponse.payer_account_id,
          },
          keyManager,
          false,
          ['schedule:payer'],
        );
      }
      let admin;
      if (
        scheduleResponse.admin_key?.key &&
        scheduleResponse.admin_key?._type
      ) {
        admin = await api.keyResolver.getPublicKey(
          {
            type: CredentialType.PUBLIC_KEY,
            publicKey: scheduleResponse.admin_key.key,
            keyType:
              scheduleResponse.admin_key?._type ===
              MirrorNodeKeyType.ED25519.toString()
                ? KeyAlgorithm.ED25519
                : KeyAlgorithm.ECDSA,
            rawValue: scheduleResponse.admin_key.key,
          },
          keyManager,
          false,
          ['schedule:admin'],
        );
      }
      updatedScheduledRecord = {
        name: scheduleName,
        network,
        keyManager,
        adminKeyRefId: admin?.keyRefId,
        adminPublicKey: admin?.publicKey,
        payerAccountId: scheduleResponse.payer_account_id,
        payerKeyRefId: payer?.keyRefId,
        memo: scheduleResponse.memo,
        expirationTime: scheduleResponse.expiration_time
          ? hederaTimestampToIso(scheduleResponse.expiration_time)
          : undefined,
        waitForExpiry: scheduleResponse.wait_for_expiry,
        scheduled: true,
        executed: !!scheduleResponse.executed_timestamp,
        createdAt: scheduleResponse.consensus_timestamp
          ? hederaTimestampToIso(scheduleResponse.consensus_timestamp)
          : new Date().toISOString(),
      };
      stateHelper.saveScheduled(
        composeKey(network, scheduleName),
        updatedScheduledRecord,
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
  return new ScheduleVerifyCommand().execute(args);
}

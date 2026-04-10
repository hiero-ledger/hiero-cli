import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { AbstractHook } from '@/core/hooks/abstract-hook';
import type { CustomHandlerHookParams, HookResult } from '@/core/hooks/types';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { ScheduledTransactionData } from '@/plugins/schedule';
import type { ScheduleVerifyResult } from '@/plugins/schedule/commands/verify/types';
import type { ScheduleVerifyOutput } from './output';

import { KeyAlgorithm, NotFoundError } from '@/core';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { CredentialType } from '@/core/services/kms/kms-types.interface';
import { MirrorNodeKeyType } from '@/core/services/mirrornode/types';
import { hederaTimestampToIso } from '@/core/utils/hedera-timestamp';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandScheduleStateHelper } from '@/plugins/schedule';

import { ScheduleVerifyInputSchema } from './input';

export const SCHEDULE_VERIFY_COMMAND_NAME = 'schedule_verify';

export class ScheduleVerifyCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;
    const validArgs = ScheduleVerifyInputSchema.parse(args.args);
    const stateHelper = new ZustandScheduleStateHelper(api.state, api.logger);
    const scheduleName = validArgs.name;
    const scheduleId = validArgs.scheduleId;
    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);
    const network = api.network.getCurrentNetwork();
    let scheduleRecord;
    if (scheduleName) {
      scheduleRecord = stateHelper.getScheduled(
        composeKey(network, scheduleName),
      );
    }
    const resolvedScheduleId = scheduleRecord
      ? scheduleRecord.scheduledId
      : scheduleId;
    if (!resolvedScheduleId) {
      throw new NotFoundError(
        `Schedule ID is missing for parameter ${scheduleName} and was not directly specified in schedule-id parameter`,
      );
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
      if (updatedScheduledRecord.executed && updatedScheduledRecord.command) {
        const customHandlerHookResult = await this.customHandlerHook(args, {
          customHandlerParams: {
            scheduledData: updatedScheduledRecord,
          },
        });
        if (customHandlerHookResult.breakFlow) {
          return this.processHookResult(customHandlerHookResult);
        }
      }
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
    return { result: outputData };
  }

  async customHandlerHook(
    args: CommandHandlerArgs,
    params: CustomHandlerHookParams<ScheduleVerifyResult>,
  ): Promise<HookResult> {
    return await this.executeHooks(
      async (h) =>
        h.customHandlerHook(args, params, SCHEDULE_VERIFY_COMMAND_NAME),
      args.hooks,
    );
  }

  async executeHooks(
    hookExecutor: (hook: AbstractHook) => Promise<HookResult>,
    hooks?: AbstractHook[],
  ): Promise<HookResult> {
    if (!hooks) {
      return {
        breakFlow: false,
        result: {
          message: 'no hooks available',
        },
      };
    }

    for (const hook of hooks) {
      const hookResult = await hookExecutor(hook);
      if (hookResult.breakFlow) {
        return hookResult;
      }
    }
    return {
      breakFlow: false,
      result: {
        message: 'success',
      },
    };
  }

  async processHookResult(hookResult: HookResult): Promise<CommandResult> {
    return Promise.resolve({
      result: hookResult.result,
      overrideSchema: hookResult.schema,
      overrideHumanTemplate: hookResult.humanTemplate,
    });
  }
}

export async function scheduleVerify(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ScheduleVerifyCommand().execute(args);
}

/**
 * Schedule sign — ScheduleSignTransaction
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { ScheduledTransactionData } from '@/plugins/schedule/schema';
import type { ScheduleSignOutput } from './output';
import type {
  ScheduleSignBuildTransactionResult,
  ScheduleSignExecuteTransactionResult,
  ScheduleSignNormalisedParams,
  ScheduleSignSignTransactionResult,
} from './types';

import { ValidationError } from '@/core';
import { BaseTransactionCommand } from '@/core/commands/command';
import { TransactionError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { OrchestratorSource } from '@/core/types/shared.types';
import { composeKey } from '@/core/utils/key-composer';
import { ScheduleHelper } from '@/plugins/schedule/schedule-helper';
import { ZustandScheduleStateHelper } from '@/plugins/schedule/zustand-state-helper';

import { ScheduleSignInputSchema } from './input';

export const SCHEDULE_SIGN_COMMAND_NAME = 'schedule_sign';

export class ScheduleSignCommand extends BaseTransactionCommand<
  ScheduleSignNormalisedParams,
  ScheduleSignBuildTransactionResult,
  ScheduleSignSignTransactionResult,
  ScheduleSignExecuteTransactionResult
> {
  constructor() {
    super(SCHEDULE_SIGN_COMMAND_NAME);
  }

  protected override mapExecuteResultForHooks(
    executeTransactionResult: ScheduleSignExecuteTransactionResult,
  ): unknown {
    if (executeTransactionResult.scheduledData) {
      return {
        source: OrchestratorSource.SCHEDULE,
        scheduledData: executeTransactionResult.scheduledData,
      };
    }
    return executeTransactionResult;
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<ScheduleSignNormalisedParams> {
    const { api } = args;
    const validArgs = ScheduleSignInputSchema.parse(args.args);

    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManager>(ConfigOptionKey.default_key_manager);

    const currentNetwork = api.network.getCurrentNetwork();
    const scheduleHelper = new ScheduleHelper(
      api.state,
      api.mirror,
      api.logger,
    );
    const schedule = await scheduleHelper.resolveScheduleIdByEntityReference({
      scheduleReference: validArgs.schedule.value,
      type: validArgs.schedule.type,
      network: currentNetwork,
    });
    if (!schedule.scheduled) {
      throw new ValidationError(
        `Schedule has not been yet submitted on Hedera network: ${validArgs.schedule.value}`,
      );
    }
    if (schedule.executed) {
      throw new ValidationError(
        `Schedule is already executed: ${validArgs.schedule.value}`,
      );
    }
    if (!schedule.scheduleId) {
      throw new ValidationError(
        `Couldn't resolve schedule ID for signing for schedule parameter: ${validArgs.schedule.value}`,
      );
    }

    let signerKeyRefIds: string[];
    if (validArgs.key) {
      const signer = await api.keyResolver.resolveSigningKey(
        validArgs.key,
        keyManager,
        false,
        ['schedule:signer'],
      );
      signerKeyRefIds = [signer.keyRefId];
    } else {
      const mirrorScheduleInfo = await api.mirror.getScheduled(
        schedule.scheduleId,
      );
      const { keyRefIds } =
        await api.keyResolver.resolveSigningKeyRefIdsFromMirrorRoleKey({
          mirrorRoleKey: mirrorScheduleInfo.admin_key,
          explicitCredentials: [],
          keyManager,
          resolveSigningKeyLabels: ['schedule:signer'],
          emptyMirrorRoleKeyMessage:
            'Schedule has no admin key on the network. Provide --key to specify the signing key.',
          insufficientKmsMatchesMessage:
            'No matching signer key found in key manager for this schedule. Provide --key.',
          validationErrorOptions: {
            context: { scheduleId: schedule.scheduleId },
          },
        });
      signerKeyRefIds = keyRefIds;
    }

    return {
      scheduleName: schedule.name,
      scheduleId: schedule.scheduleId,
      scheduled: schedule.scheduled,
      executed: schedule.executed,
      network: currentNetwork,
      keyManager,
      keyRefIds: signerKeyRefIds,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: ScheduleSignNormalisedParams,
  ): Promise<ScheduleSignBuildTransactionResult> {
    const transaction = args.api.schedule.buildScheduleSignTransaction({
      scheduleId: normalisedParams.scheduleId,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: ScheduleSignNormalisedParams,
    buildTransactionResult: ScheduleSignBuildTransactionResult,
  ): Promise<ScheduleSignSignTransactionResult> {
    const signedTransaction = await args.api.txSign.sign(
      buildTransactionResult.transaction,
      normalisedParams.keyRefIds,
    );
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: ScheduleSignNormalisedParams,
    _buildTransactionResult: ScheduleSignBuildTransactionResult,
    signTransactionResult: ScheduleSignSignTransactionResult,
  ): Promise<ScheduleSignExecuteTransactionResult> {
    const result = await args.api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    if (!result.success) {
      throw new TransactionError(
        `Schedule sign failed for ${normalisedParams.scheduleId} (txId: ${result.transactionId})`,
        false,
      );
    }

    const updatedScheduledRecord =
      await this.syncScheduleExecutionStatusFromMirror(args, normalisedParams);

    return {
      transactionId: result.transactionId,
      success: result.success,
      status: result.receipt?.status?.status,
      scheduledData: updatedScheduledRecord,
    };
  }

  /**
   * After a successful sign tx, refresh schedule state from the mirror. If the
   * schedule has executed (executed_timestamp set) and we have a local named
   * entry, mark it executed — same idea as {@link ScheduleVerifyCommand}.
   */
  private async syncScheduleExecutionStatusFromMirror(
    args: CommandHandlerArgs,
    normalisedParams: ScheduleSignNormalisedParams,
  ): Promise<ScheduledTransactionData | undefined> {
    const { api } = args;
    const scheduleResponse = await api.mirror.getScheduled(
      normalisedParams.scheduleId,
    );

    if (!scheduleResponse) {
      return undefined;
    }

    const scheduleName = normalisedParams.scheduleName;
    if (!scheduleName) {
      return undefined;
    }

    const stateHelper = new ZustandScheduleStateHelper(api.state, api.logger);
    const scheduleRecord = stateHelper.getScheduled(
      composeKey(normalisedParams.network, scheduleName),
    );

    if (!scheduleRecord || scheduleRecord.executed) {
      return undefined;
    }

    const updatedScheduledRecord: ScheduledTransactionData = {
      ...scheduleRecord,
      scheduled: true,
      executed: Boolean(scheduleResponse.executed_timestamp),
    };
    stateHelper.saveScheduled(
      composeKey(normalisedParams.network, scheduleRecord.name),
      updatedScheduledRecord,
    );
    return updatedScheduledRecord;
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: ScheduleSignNormalisedParams,
    _buildTransactionResult: ScheduleSignBuildTransactionResult,
    _signTransactionResult: ScheduleSignSignTransactionResult,
    executeTransactionResult: ScheduleSignExecuteTransactionResult,
  ): Promise<CommandResult> {
    const outputData: ScheduleSignOutput = {
      name: normalisedParams.scheduleName,
      scheduleId: normalisedParams.scheduleId,
      transactionId: executeTransactionResult.transactionId,
      network: normalisedParams.network,
    };

    return { result: outputData };
  }
}

export async function scheduleSign(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new ScheduleSignCommand().execute(args);
}

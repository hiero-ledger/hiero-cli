import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { ScheduleKeysService } from '@/plugins/schedule/services/schedule-keys.service.interface';
import type { ScheduleResolverService } from '@/plugins/schedule/services/schedule-resolver.service.interface';
import type { ScheduleSyncService } from '@/plugins/schedule/services/schedule-sync.service.interface';
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
import { ScheduleKeysServiceImpl } from '@/plugins/schedule/services/schedule-keys.service';
import { ScheduleResolverServiceImpl } from '@/plugins/schedule/services/schedule-resolver.service';
import { ScheduleStateServiceImpl } from '@/plugins/schedule/services/schedule-state.service';
import { ScheduleSyncServiceImpl } from '@/plugins/schedule/services/schedule-sync.service';

import { ScheduleSignInputSchema } from './input';

export const SCHEDULE_SIGN_COMMAND_NAME = 'schedule_sign';

export class ScheduleSignCommand extends BaseTransactionCommand<
  ScheduleSignNormalisedParams,
  ScheduleSignBuildTransactionResult,
  ScheduleSignSignTransactionResult,
  ScheduleSignExecuteTransactionResult
> {
  constructor(
    private readonly scheduleResolver: ScheduleResolverService,
    private readonly scheduleKeys: ScheduleKeysService,
    private readonly scheduleSync: ScheduleSyncService,
  ) {
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
    const schedule =
      await this.scheduleResolver.resolveScheduleIdByEntityReference({
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

    const signerKeyRefIds = await this.scheduleKeys.resolveSignKeyRefs(
      schedule.scheduleId,
      validArgs.key ?? [],
      keyManager,
    );

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
      await this.scheduleSync.markExecutionStatusFromMirror(
        normalisedParams.scheduleId,
        normalisedParams.scheduleName,
        normalisedParams.network,
      );

    return {
      transactionId: result.transactionId,
      success: result.success,
      status: result.receipt?.status?.status,
      scheduledData: updatedScheduledRecord,
    };
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
  const { api } = args;
  const scheduleState = new ScheduleStateServiceImpl(api.state, api.logger);
  const scheduleResolver = new ScheduleResolverServiceImpl(
    scheduleState,
    api.mirror,
  );
  const scheduleKeys = new ScheduleKeysServiceImpl(api.keyResolver, api.mirror);
  const scheduleSync = new ScheduleSyncServiceImpl(
    scheduleState,
    api.mirror,
    scheduleKeys,
  );

  return new ScheduleSignCommand(
    scheduleResolver,
    scheduleKeys,
    scheduleSync,
  ).execute(args);
}

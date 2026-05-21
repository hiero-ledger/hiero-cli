import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
import type { ScheduleKeysService } from '@/plugins/schedule/services/schedule-keys.service.interface';
import type { ScheduleResolverService } from '@/plugins/schedule/services/schedule-resolver.service.interface';
import type { ScheduleStateService } from '@/plugins/schedule/services/schedule-state.service.interface';
import type { ScheduleDeleteOutput } from './output';
import type {
  ScheduleDeleteBuildTransactionResult,
  ScheduleDeleteExecuteTransactionResult,
  ScheduleDeleteNormalisedParams,
  ScheduleDeleteSignTransactionResult,
} from './types';

import { ValidationError } from '@/core';
import { BaseTransactionCommand } from '@/core/commands/command';
import { TransactionError } from '@/core/errors';
import { ConfigOptionKey } from '@/core/services/config/config-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { ScheduleKeysServiceImpl } from '@/plugins/schedule/services/schedule-keys.service';
import { ScheduleResolverServiceImpl } from '@/plugins/schedule/services/schedule-resolver.service';
import { ScheduleStateServiceImpl } from '@/plugins/schedule/services/schedule-state.service';

import { ScheduleDeleteInputSchema } from './input';

export const SCHEDULE_DELETE_COMMAND_NAME = 'schedule_delete';

export class ScheduleDeleteCommand extends BaseTransactionCommand<
  ScheduleDeleteNormalisedParams,
  ScheduleDeleteBuildTransactionResult,
  ScheduleDeleteSignTransactionResult,
  ScheduleDeleteExecuteTransactionResult
> {
  constructor(
    private readonly scheduleState: ScheduleStateService,
    private readonly scheduleResolver: ScheduleResolverService,
    private readonly scheduleKeys: ScheduleKeysService,
  ) {
    super(SCHEDULE_DELETE_COMMAND_NAME);
  }

  override async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const validArgs = ScheduleDeleteInputSchema.parse(args.args);
    const { api } = args;
    const network = api.network.getCurrentNetwork();
    const schedule =
      await this.scheduleResolver.resolveScheduleIdByEntityReference({
        scheduleReference: validArgs.schedule.value,
        type: validArgs.schedule.type,
        network,
      });

    const submitOnChainDelete = schedule.scheduled && !schedule.executed;

    if (!submitOnChainDelete) {
      api.logger.info(
        `Scheduled record already on chain or not submitted on Hedera network`,
      );
      if (!schedule.name) {
        throw new ValidationError(
          `Could not resolve schedule ID for ${validArgs.schedule.value}`,
        );
      }
      this.scheduleState.deleteScheduled(composeKey(network, schedule.name));
      api.logger.info(
        `Removed local schedule record "${schedule.name}" without on-chain delete (scheduled=${String(schedule.scheduled)}, executed=${String(schedule.executed)}).`,
      );

      const outputData: ScheduleDeleteOutput = {
        name: schedule.name,
        scheduleId: schedule.scheduleId,
        network,
      };

      return { result: outputData };
    }

    return super.execute(args);
  }

  async normalizeParams(
    args: CommandHandlerArgs,
  ): Promise<ScheduleDeleteNormalisedParams> {
    const { api } = args;
    const validArgs = ScheduleDeleteInputSchema.parse(args.args);

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
    if (!schedule.scheduleId) {
      throw new ValidationError(
        `Could not resolve schedule ID for ${validArgs.schedule.value}`,
      );
    }
    const adminKeyRefIds = await this.scheduleKeys.resolveDeleteAdminKeyRefs(
      schedule,
      validArgs.adminKey,
      keyManager,
    );

    return {
      scheduleName: schedule.name,
      scheduleId: schedule.scheduleId,
      scheduled: schedule.scheduled,
      executed: schedule.executed,
      network: currentNetwork,
      keyManager,
      keyRefIds: adminKeyRefIds,
    };
  }

  async buildTransaction(
    args: CommandHandlerArgs,
    normalisedParams: ScheduleDeleteNormalisedParams,
  ): Promise<ScheduleDeleteBuildTransactionResult> {
    const transaction = args.api.schedule.buildScheduleDeleteTransaction({
      scheduleId: normalisedParams.scheduleId,
    });
    return { transaction };
  }

  async signTransaction(
    args: CommandHandlerArgs,
    normalisedParams: ScheduleDeleteNormalisedParams,
    buildTransactionResult: ScheduleDeleteBuildTransactionResult,
  ): Promise<ScheduleDeleteSignTransactionResult> {
    const signedTransaction = await args.api.txSign.sign(
      buildTransactionResult.transaction,
      normalisedParams.keyRefIds,
    );
    return { signedTransaction };
  }

  async executeTransaction(
    args: CommandHandlerArgs,
    normalisedParams: ScheduleDeleteNormalisedParams,
    _buildTransactionResult: ScheduleDeleteBuildTransactionResult,
    signTransactionResult: ScheduleDeleteSignTransactionResult,
  ): Promise<ScheduleDeleteExecuteTransactionResult> {
    const result = await args.api.txExecute.execute(
      signTransactionResult.signedTransaction,
    );

    if (!result.success) {
      throw new TransactionError(
        `Schedule delete failed for ${normalisedParams.scheduleId} (txId: ${result.transactionId})`,
        false,
      );
    }

    return {
      transactionId: result.transactionId,
      success: result.success,
      status: result.receipt?.status?.status,
    };
  }

  async outputPreparation(
    _args: CommandHandlerArgs,
    normalisedParams: ScheduleDeleteNormalisedParams,
    _buildTransactionResult: ScheduleDeleteBuildTransactionResult,
    _signTransactionResult: ScheduleDeleteSignTransactionResult,
    executeTransactionResult: ScheduleDeleteExecuteTransactionResult,
  ): Promise<CommandResult> {
    if (normalisedParams.scheduleName) {
      this.scheduleState.deleteScheduled(
        composeKey(normalisedParams.network, normalisedParams.scheduleName),
      );
    }

    const displayName =
      normalisedParams.scheduleName ?? normalisedParams.scheduleId;

    const outputData: ScheduleDeleteOutput = {
      name: displayName,
      scheduleId: normalisedParams.scheduleId,
      transactionId: executeTransactionResult.transactionId,
      network: normalisedParams.network,
    };

    return { result: outputData };
  }
}

export async function scheduleDelete(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api } = args;
  const scheduleState = new ScheduleStateServiceImpl(api.state, api.logger);
  const scheduleResolver = new ScheduleResolverServiceImpl(
    scheduleState,
    api.mirror,
  );
  const scheduleKeys = new ScheduleKeysServiceImpl(api.keyResolver, api.mirror);

  return new ScheduleDeleteCommand(
    scheduleState,
    scheduleResolver,
    scheduleKeys,
  ).execute(args);
}

/**
 * Schedule sign — ScheduleSignTransaction
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { KeyManager } from '@/core/services/kms/kms-types.interface';
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
import { ScheduleHelper } from '@/plugins/schedule';

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

    const signer = await api.keyResolver.resolveSigningKey(
      validArgs.key,
      keyManager,
      false,
      ['schedule:signer'],
    );

    return {
      scheduleName: schedule.name,
      scheduleId: schedule.scheduleId,
      scheduled: schedule.scheduled,
      executed: schedule.executed,
      network: currentNetwork,
      keyManager,
      signer,
      keyRefIds: [signer.keyRefId],
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

    return {
      transactionId: result.transactionId,
      success: result.success,
      status: result.receipt?.status?.status,
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
  return new ScheduleSignCommand().execute(args);
}

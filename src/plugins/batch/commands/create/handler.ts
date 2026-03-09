/**
 * Batch Create Command Handler
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { CreateBatchOutput } from './output';

import { ValidationError } from '@/core/errors';
import { ZustandBatchStateHelper } from '@/plugins/batch/zustand-state-helper';

import { CreateBatchInputSchema } from './input';

export class CreateBatchCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const batchState = new ZustandBatchStateHelper(api.state, logger);
    const validArgs = CreateBatchInputSchema.parse(args.args);

    if (batchState.hasBatch(validArgs.name)) {
      throw new ValidationError(
        `Batch with name '${validArgs.name}' already exists`,
      );
    }

    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManagerName>('default_key_manager');

    const resolved = await api.keyResolver.resolveSigningKey(
      validArgs.key,
      keyManager,
      ['batch:signer'],
    );

    const batchData = {
      name: validArgs.name,
      keyRefId: resolved.keyRefId,
    };

    batchState.saveBatch(validArgs.name, batchData);

    const outputData: CreateBatchOutput = {
      name: batchData.name,
      keyRefId: batchData.keyRefId,
    };

    return { result: outputData };
  }
}

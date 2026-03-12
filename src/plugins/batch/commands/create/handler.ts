/**
 * Batch Create Command Handler
 */
import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { KeyManagerName } from '@/core/services/kms/kms-types.interface';
import type { CreateBatchOutput } from './output';

import { ValidationError } from '@/core/errors';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandBatchStateHelper } from '@/plugins/batch/zustand-state-helper';

import { CreateBatchInputSchema } from './input';

export class BatchCreateCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;

    const batchState = new ZustandBatchStateHelper(api.state, logger);
    const validArgs = CreateBatchInputSchema.parse(args.args);
    const name = validArgs.name;
    const batchKey = validArgs.key;
    const network = api.network.getCurrentNetwork();
    const key = composeKey(network, name);

    if (batchState.hasBatch(key)) {
      throw new ValidationError(`Batch with name '${key}' already exists`);
    }

    const keyManager =
      validArgs.keyManager ||
      api.config.getOption<KeyManagerName>('default_key_manager');

    const resolved = await api.keyResolver.resolveSigningKey(
      batchKey,
      keyManager,
      ['batch:signer'],
    );

    const batchData = {
      name,
      keyRefId: resolved.keyRefId,
      executed: false,
      success: false,
      transactions: [],
    };

    batchState.saveBatch(key, batchData);

    const outputData: CreateBatchOutput = {
      name: batchData.name,
      keyRefId: batchData.keyRefId,
    };

    return { result: outputData };
  }
}

export async function batchCreate(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new BatchCreateCommand().execute(args);
}

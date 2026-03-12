import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { RemoveCredentialsOutput } from './output';

import { NotFoundError } from '@/core/errors';

import { RemoveCredentialsInputSchema } from './input';

export class RemoveCredentialsCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { logger, api } = args;

    const { id } = RemoveCredentialsInputSchema.parse(args.args);

    logger.info(`🗑️  Removing credentials for id: ${id}`);

    const publicKey = api.kms.get(id)?.publicKey;
    if (!publicKey) {
      throw new NotFoundError(
        `Credential with key reference ID '${id}' does not exist`,
        {
          context: { id },
        },
      );
    }

    api.kms.remove(id);

    const outputData: RemoveCredentialsOutput = {
      keyRefId: id,
      removed: true,
    };

    return { result: outputData };
  }
}

export async function removeCredentials(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new RemoveCredentialsCommand().execute(args);
}

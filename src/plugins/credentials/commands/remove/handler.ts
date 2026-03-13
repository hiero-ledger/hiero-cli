import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { CredentialsRemoveOutput } from './output';

import { NotFoundError } from '@/core/errors';

import { CredentialsRemoveInputSchema } from './input';

export class CredentialsRemoveCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { logger, api } = args;

    const { id } = CredentialsRemoveInputSchema.parse(args.args);

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

    const outputData: CredentialsRemoveOutput = {
      keyRefId: id,
      removed: true,
    };

    return { result: outputData };
  }
}

export async function credentialsRemove(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new CredentialsRemoveCommand().execute(args);
}

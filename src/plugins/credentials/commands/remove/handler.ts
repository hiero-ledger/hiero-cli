import type { CommandHandlerArgs } from '@/core/plugins/plugin.interface';
import type { CommandResult } from '@/core/plugins/plugin.types';
import type { RemoveCredentialsOutput } from './output';

import { NotFoundError } from '@/core/errors';

import { RemoveCredentialsInputSchema } from './input';

export async function removeCredentials(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { logger, api } = args;

  const { id } = RemoveCredentialsInputSchema.parse(args.args);

  logger.info(`🗑️  Removing credentials for id: ${id}`);

  const publicKey = api.kms.getPublicKey(id);
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

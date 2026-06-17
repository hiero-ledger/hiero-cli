import type { CommandHandlerArgs, CommandResult, CoreApi } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { SupportedNetwork } from '@/core/types/shared.types';
import type { CredentialsRemoveOutput } from './output';

import { NotFoundError } from '@/core/errors';
import { AliasType } from '@/core/types/shared.types';

import { CredentialsRemoveInputSchema } from './input';

export class CredentialsRemoveCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api } = args;

    const { id, alias } = CredentialsRemoveInputSchema.parse(args.args);

    const network = api.network.getCurrentNetwork();

    const outputData = alias
      ? this.removeByAlias(api, alias, network)
      : this.removeById(api, id as string, network);

    return { result: outputData };
  }

  private removeByAlias(
    api: CoreApi,
    alias: string,
    network: SupportedNetwork,
  ): CredentialsRemoveOutput {
    const record = api.alias.resolveOrThrow(alias, AliasType.Key, network);

    if (!record.keyRefId) {
      throw new NotFoundError(
        `Key alias '${alias}' is not linked to a key reference`,
        { context: { alias, network } },
      );
    }

    api.logger.info(`🗑️  Removing credentials for alias: ${alias}`);

    api.kms.remove(record.keyRefId);
    api.alias.remove(alias, network);

    return { keyRefId: record.keyRefId };
  }

  private removeById(
    api: CoreApi,
    id: string,
    network: SupportedNetwork,
  ): CredentialsRemoveOutput {
    api.logger.info(`🗑️  Removing credentials for id: ${id}`);

    const publicKey = api.kms.get(id)?.publicKey;
    if (!publicKey) {
      throw new NotFoundError(
        `Credential with key reference ID '${id}' does not exist`,
        { context: { id } },
      );
    }

    api.kms.remove(id);

    // Symmetric cleanup: unregister any current-network Key alias pointing at
    // this key so the alias layer never holds a dangling reference.
    (api.alias.list({ network, type: AliasType.Key }) ?? [])
      .filter((aliasRecord) => aliasRecord.keyRefId === id)
      .map((aliasRecord) => aliasRecord.alias)
      .forEach((alias) => api.alias.remove(alias, network));

    return {
      keyRefId: id,
    };
  }
}

export async function credentialsRemove(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new CredentialsRemoveCommand().execute(args);
}

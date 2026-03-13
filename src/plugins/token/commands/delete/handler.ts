import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { Command } from '@/core/commands/command.interface';
import type { TokenDeleteOutput } from './output';
import type { TokenDeleteNormalizedParams } from './types';

import { NotFoundError } from '@/core/errors';
import { AliasType } from '@/core/services/alias/alias-service.interface';
import { composeKey } from '@/core/utils/key-composer';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { TokenDeleteInputSchema } from './input';

export class TokenDeleteCommand implements Command {
  async execute(args: CommandHandlerArgs): Promise<CommandResult> {
    const { api, logger } = args;
    const tokenState = new ZustandTokenStateHelper(api.state, logger);

    logger.info('Deleting token from state...');

    const validArgs: { token: TokenDeleteNormalizedParams } =
      TokenDeleteInputSchema.parse(args.args);
    const currentNetwork = api.network.getCurrentNetwork();

    const resolvedToken =
      api.identityResolution.resolveReferenceToEntityOrEvmAddress({
        entityReference: validArgs.token.value,
        referenceType: validArgs.token.type,
        network: currentNetwork,
        aliasType: AliasType.Token,
      });
    const tokenId = resolvedToken.entityIdOrEvmAddress;
    const key = composeKey(currentNetwork, tokenId);

    const tokenToDelete = tokenState.getToken(key);
    if (!tokenToDelete) {
      throw new NotFoundError('Token not found in state', {
        context: { token: validArgs.token.value },
      });
    }

    const aliasesForToken = api.alias
      .list({ network: currentNetwork, type: AliasType.Token })
      .filter((rec) => rec.entityId === tokenToDelete.tokenId);

    const removedAliases: string[] = [];
    for (const rec of aliasesForToken) {
      api.alias.remove(rec.alias, currentNetwork);
      removedAliases.push(`${rec.alias} (${currentNetwork})`);
      logger.info(`🧹 Removed alias '${rec.alias}' on ${currentNetwork}`);
    }

    tokenState.removeToken(key);

    const outputData: TokenDeleteOutput = {
      deletedToken: {
        name: tokenToDelete.name,
        tokenId: tokenToDelete.tokenId,
      },
      network: currentNetwork,
    };

    if (removedAliases.length > 0) {
      outputData.removedAliases = removedAliases;
    }

    return { result: outputData };
  }
}

export async function tokenDelete(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  return new TokenDeleteCommand().execute(args);
}

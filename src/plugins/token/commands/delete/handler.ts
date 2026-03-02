import type { CommandHandlerArgs, CommandResult } from '@/core';
import type { DeleteTokenOutput } from './output';

import { NotFoundError } from '@/core/errors';
import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { DeleteTokenInputSchema } from './input';

export async function deleteToken(
  args: CommandHandlerArgs,
): Promise<CommandResult> {
  const { api, logger } = args;

  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  logger.info(`Deleting token from state...`);

  const validArgs = DeleteTokenInputSchema.parse(args.args);

  const currentNetwork = api.network.getCurrentNetwork();

  const resolvedToken =
    api.identityResolution.resolveReferenceToEntityOrEvmAddress({
      entityReference: validArgs.token.value,
      referenceType: validArgs.token.type,
      network: currentNetwork,
      aliasType: ALIAS_TYPE.Token,
    });

  const tokenToDelete = tokenState.getToken(resolvedToken.entityIdOrEvmAddress);
  if (!tokenToDelete) {
    throw new NotFoundError('Token not found in state', {
      context: { token: validArgs.token.value },
    });
  }

  const aliasesForToken = api.alias
    .list({ network: currentNetwork, type: ALIAS_TYPE.Token })
    .filter((rec) => rec.entityId === tokenToDelete.tokenId);

  const removedAliases: string[] = [];
  for (const rec of aliasesForToken) {
    api.alias.remove(rec.alias, currentNetwork);
    removedAliases.push(`${rec.alias} (${currentNetwork})`);
    logger.info(`🧹 Removed alias '${rec.alias}' on ${currentNetwork}`);
  }

  tokenState.removeToken(tokenToDelete.tokenId);

  const outputData: DeleteTokenOutput = {
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

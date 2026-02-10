/**
 * Token Delete Command Handler
 * Handles deleting tokens from local state only
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { DeleteTokenOutput } from './output';

import { ALIAS_TYPE } from '@/core/services/alias/alias-service.interface';
import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { DeleteTokenInputSchema } from './input';

export async function deleteToken(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  logger.info(`Deleting token from state...`);

  try {
    const validArgs = DeleteTokenInputSchema.parse(args.args);

    const name = validArgs.name;
    const tokenId = validArgs.id;

    let tokenToDelete;

    if (tokenId) {
      tokenToDelete = tokenState.getToken(tokenId);
      if (!tokenToDelete) {
        throw new Error(`Token with ID '${tokenId}' not found in state`);
      }
    } else if (name) {
      const currentNetwork = api.network.getCurrentNetwork();
      const aliasRecord = api.alias.resolve(name, 'token', currentNetwork);
      if (!aliasRecord || !aliasRecord.entityId) {
        throw new Error(
          `Token with name '${name}' not found for network ${currentNetwork}`,
        );
      }
      tokenToDelete = tokenState.getToken(aliasRecord.entityId);
      if (!tokenToDelete) {
        throw new Error(
          `Token with name '${name}' (ID: ${aliasRecord.entityId}) not found in state`,
        );
      }
    } else {
      throw new Error('Either name or id must be provided');
    }

    const currentNetwork = api.network.getCurrentNetwork();

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

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to delete token', error),
    };
  }
}

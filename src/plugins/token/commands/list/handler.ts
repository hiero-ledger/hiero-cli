/**
 * Token List Command Handler
 * Handles listing tokens from state for the current network
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import type { CommandExecutionResult, CommandHandlerArgs } from '@/core';
import type { ListTokensOutput } from './output';

import { Status } from '@/core/shared/constants';
import { formatError } from '@/core/utils/errors';
import { findTokenAlias } from '@/plugins/account/utils/balance-helpers';
import { ZustandTokenStateHelper } from '@/plugins/token/zustand-state-helper';

import { ListTokenInputSchema } from './input';

export async function listTokens(
  args: CommandHandlerArgs,
): Promise<CommandExecutionResult> {
  const { api, logger } = args;

  const tokenState = new ZustandTokenStateHelper(api.state, logger);

  const validArgs = ListTokenInputSchema.parse(args.args);

  const showKeys = validArgs.keys;
  const networkFilter = validArgs.network;

  const currentNetwork = api.network.getCurrentNetwork();
  const targetNetwork = networkFilter || currentNetwork;

  logger.info('Listing tokens...');
  logger.debug(`[TOKEN LIST] Current network: ${currentNetwork}`);
  logger.debug(`[TOKEN LIST] Target network: ${targetNetwork}`);
  logger.debug(
    `[TOKEN LIST] Network filter override: ${networkFilter || 'none'}`,
  );

  try {
    let tokens = tokenState.listTokens();
    logger.debug(
      `[TOKEN LIST] Retrieved ${tokens.length} tokens from state before filtering`,
    );

    tokens.forEach((token, index) => {
      logger.debug(
        `[TOKEN LIST]   ${index + 1}. ${token.name} (${token.symbol}) - ${token.tokenId} on ${token.network}`,
      );
    });

    const tokensBeforeFilter = tokens.length;
    tokens = tokens.filter((token) => token.network === targetNetwork);
    logger.debug(
      `[TOKEN LIST] After network filtering: ${tokens.length} tokens (filtered out ${tokensBeforeFilter - tokens.length})`,
    );

    const tokensList = tokens.map((token) => {
      const alias = findTokenAlias(api, token.tokenId, token.network);

      return {
        tokenId: token.tokenId,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        supplyType: token.supplyType,
        treasuryId: token.treasuryId,
        network: token.network,
        alias,
        maxSupply: Number(token.maxSupply),
        associationCount: token.associations?.length || 0,
        ...(showKeys &&
          token.adminPublicKey && {
            keys: {
              adminKey: token.adminPublicKey,
              supplyKey: null,
              wipeKey: null,
              kycKey: null,
              freezeKey: null,
              pauseKey: null,
              feeScheduleKey: null,
              treasuryKey: null,
            },
          }),
      };
    });

    const stats = tokenState.getTokensWithStats();

    const outputData: ListTokensOutput = {
      tokens: tokensList,
      totalCount: tokens.length,
      network: targetNetwork,
      stats: {
        total: stats.total,
        withKeys: stats.withKeys,
        byNetwork: stats.byNetwork,
        bySupplyType: stats.bySupplyType,
        withAssociations: stats.withAssociations,
        totalAssociations: stats.totalAssociations,
      },
    };

    return {
      status: Status.Success,
      outputJson: JSON.stringify(outputData),
    };
  } catch (error: unknown) {
    return {
      status: Status.Failure,
      errorMessage: formatError('Failed to list tokens', error),
    };
  }
}

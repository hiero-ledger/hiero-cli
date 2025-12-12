/**
 * Token List Command Handler
 * Handles listing tokens from state for the current network
 * Follows ADR-003 contract: returns CommandExecutionResult
 */
import { CommandHandlerArgs } from '../../../../core';
import { CommandExecutionResult } from '../../../../core';
import { Status } from '../../../../core/shared/constants';
import { ZustandTokenStateHelper } from '../../zustand-state-helper';
import { formatError } from '../../../../core/utils/errors';
import { ListTokensOutput } from './output';
import { ListTokenInputSchema } from './input';
import { findTokenAlias } from '../../../account/utils/balance-helpers';
import { displayToken, displayStatistics } from '../../utils/token-display';

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

    if (tokens.length === 0) {
      if (tokensBeforeFilter > 0) {
        logger.info(`\n⚠️  No tokens found for network: ${targetNetwork}`);
        logger.info(
          `\n💡 You have ${tokensBeforeFilter} token(s) on other networks.`,
        );
        logger.info(
          `   Use --network <network-name> to view tokens on a specific network.`,
        );
      } else if (networkFilter) {
        logger.info(`\nNo tokens found for network: ${networkFilter}`);
      } else {
        logger.info(`\nNo tokens found for current network: ${currentNetwork}`);
      }

      const outputData: ListTokensOutput = {
        tokens: [],
        count: 0,
        network: targetNetwork,
        stats: {
          total: 0,
          withKeys: 0,
          byNetwork: {},
          bySupplyType: {},
          withAssociations: 0,
          totalAssociations: 0,
        },
      };

      return {
        status: Status.Success,
        outputJson: JSON.stringify(outputData),
      };
    }

    logger.info(
      `\nFound ${tokens.length} token(s) for network ${targetNetwork}:`,
    );
    if (tokensBeforeFilter > tokens.length) {
      logger.info(
        `(${tokensBeforeFilter - tokens.length} token(s) filtered out from other networks)`,
      );
    }
    logger.info('──────────────────────────────────────');

    const tokensList = tokens.map((token, index) => {
      const alias = findTokenAlias(api, token.tokenId, token.network);

      displayToken(token, index, showKeys, alias, logger);

      if (index < tokens.length - 1) {
        logger.info('');
      }

      return {
        tokenId: token.tokenId,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        supplyType: token.supplyType,
        treasuryId: token.treasuryId,
        network: token.network,
        alias,
      };
    });

    const stats = tokenState.getTokensWithStats();
    displayStatistics(stats, logger);

    const outputData: ListTokensOutput = {
      tokens: tokensList,
      count: tokens.length,
      network: targetNetwork,
      stats: {
        total: stats.total,
        withKeys: 0, // Will need to calculate this
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
